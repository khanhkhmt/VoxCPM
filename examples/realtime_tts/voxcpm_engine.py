"""
VoxCPM engine adapter for RealtimeTTS.

Wraps `voxcpm.VoxCPM` so it can be used as a `BaseEngine` inside the
RealtimeTTS pipeline (https://github.com/KoljaB/RealtimeTTS). This lets
you leverage RealtimeTTS' producer-consumer streaming machinery
(stream2sentence, buffered audio queue, StreamPlayer) while synthesizing
audio with the local VoxCPM/VoxCPM2 model.

Usage:
    from voxcpm import VoxCPM
    from examples.realtime_tts.voxcpm_engine import VoxCPMEngine, VoxCPMVoice
    from RealtimeTTS import TextToAudioStream

    voxcpm = VoxCPM.from_pretrained("openbmb/VoxCPM2")
    voice = VoxCPMVoice(reference_wav_path="/path/to/ref.wav")
    engine = VoxCPMEngine(voxcpm=voxcpm, voice=voice, use_streaming=True)

    stream = TextToAudioStream(engine)
    stream.feed("Xin chào, đây là bản demo VoxCPM qua RealtimeTTS.")
    stream.play()
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional, Iterable, Union

import numpy as np

try:
    import pyaudio  # type: ignore
    _PAINT16 = pyaudio.paInt16
except Exception:  # pragma: no cover - pyaudio optional on headless servers
    _PAINT16 = 8  # pyaudio.paInt16 constant value; keep engine importable.

from RealtimeTTS.engines.base_engine import BaseEngine  # type: ignore

logger = logging.getLogger(__name__)


@dataclass
class VoxCPMVoice:
    """
    VoxCPM voice configuration.

    Attributes:
        name: Human-readable identifier (used by `get_voices`).
        reference_wav_path: Path to reference WAV for voice cloning
            (V2 only, structurally isolated ref tokens).
        prompt_wav_path: Path to prompt WAV for continuation mode.
        prompt_text: Transcript of `prompt_wav_path` (required when it is set).
        cfg_value: Classifier-free guidance scale.
        inference_timesteps: DiT Euler steps (10 default).
        normalize: Run text normalization before synthesis.
        normalize_lang: Language hint for text normalizer (e.g. "vi", "zh").
        denoise: Run ZipEnhancer on reference/prompt audio.
    """

    name: str = "voxcpm"
    reference_wav_path: Optional[str] = None
    prompt_wav_path: Optional[str] = None
    prompt_text: Optional[str] = None
    cfg_value: float = 2.0
    inference_timesteps: int = 10
    normalize: bool = False
    normalize_lang: Optional[str] = None
    denoise: bool = False
    min_len: int = 2
    max_len: int = 4096

    def __post_init__(self) -> None:
        if (self.prompt_wav_path is None) != (self.prompt_text is None):
            raise ValueError(
                "prompt_wav_path and prompt_text must both be provided or both None"
            )


class VoxCPMEngine(BaseEngine):
    """
    RealtimeTTS engine backed by a local VoxCPM model.

    The engine converts each sentence produced by RealtimeTTS into PCM16 LE
    bytes and pushes them into `self.queue`, which the RealtimeTTS player
    worker drains.

    Two paths are supported:
      * `use_streaming=True` (default): iterate `VoxCPM.generate_streaming`
        and push chunks to the queue as they appear, giving the lowest
        possible time-to-first-audio (TTFA).
      * `use_streaming=False`: call `VoxCPM.generate` in one shot and push
        the full sentence once; slightly higher TTFA but simpler.

    Notes:
      * Sample rate comes from the underlying model (16 kHz for V1,
        24/48 kHz for V2 depending on the AudioVAE variant). RealtimeTTS'
        player resamples/passes-through as needed.
      * Every chunk is clipped to [-1, 1] and converted to int16 LE.
      * `set_voice(...)` accepts either a `VoxCPMVoice` instance or a
        `VoxCPMVoice`-compatible mapping.
    """

    def __init__(
        self,
        voxcpm,
        voice: Optional[VoxCPMVoice] = None,
        use_streaming: bool = True,
        apply_trim_silence: bool = False,
        debug: bool = False,
    ):
        # BaseEngine.__init__ is invoked automatically by the metaclass; we
        # only need to store our own state and call `post_init`.
        self.voxcpm = voxcpm
        self.voice: VoxCPMVoice = voice or VoxCPMVoice()
        self.use_streaming = use_streaming
        self.apply_trim_silence = apply_trim_silence
        self.debug = debug

        model = getattr(voxcpm, "tts_model", None)
        if model is None or not hasattr(model, "sample_rate"):
            raise ValueError(
                "voxcpm.tts_model.sample_rate must be available (did you pass a VoxCPM instance?)"
            )
        self._sample_rate: int = int(model.sample_rate)
        self.post_init()

    # ------------------------------------------------------------------ #
    # BaseEngine hooks
    # ------------------------------------------------------------------ #
    def post_init(self) -> None:
        self.engine_name = "voxcpm"
        self.can_consume_generators = False

    def get_stream_info(self):
        """
        Return PyAudio stream configuration: (format, channels, rate).
        """
        return _PAINT16, 1, self._sample_rate

    # ------------------------------------------------------------------ #
    # Voice management
    # ------------------------------------------------------------------ #
    def get_voices(self) -> list[VoxCPMVoice]:
        """
        Return the active VoxCPM voice configuration. VoxCPM itself does not
        expose a voice catalog, so the list contains only the currently
        configured voice.
        """
        return [self.voice]

    def set_voice(self, voice: Union[VoxCPMVoice, dict, str]) -> None:
        """
        Update the active VoxCPM voice.

        Args:
            voice: Either a `VoxCPMVoice`, a mapping compatible with it, or
                a string pointing at a reference WAV file.
        """
        if isinstance(voice, VoxCPMVoice):
            self.voice = voice
        elif isinstance(voice, dict):
            self.voice = VoxCPMVoice(**voice)
        elif isinstance(voice, str):
            self.voice = VoxCPMVoice(reference_wav_path=voice, name=voice)
        else:
            raise TypeError(f"Unsupported voice type: {type(voice)!r}")

    def set_voice_parameters(self, **voice_parameters) -> None:
        """
        Update scalar fields on the current voice (cfg_value, inference_timesteps, ...).
        """
        for key, value in voice_parameters.items():
            if not hasattr(self.voice, key):
                raise AttributeError(f"VoxCPMVoice has no parameter {key!r}")
            setattr(self.voice, key, value)

    # ------------------------------------------------------------------ #
    # Synthesis
    # ------------------------------------------------------------------ #
    def synthesize(self, text: str, sentence_count: int = 0) -> bool:
        """
        Synthesize one sentence and enqueue the resulting PCM16 LE bytes.

        Called by the RealtimeTTS worker for every sentence yielded by the
        upstream tokenizer. Returns True on success, False on error.
        """
        super().synthesize(text, sentence_count)

        text = text.strip()
        if not text:
            return True

        if self.debug:
            logger.info(
                "[VoxCPMEngine] synthesize sentence_count=%d streaming=%s text=%r",
                sentence_count,
                self.use_streaming,
                text,
            )

        common_kwargs = dict(
            text=text,
            prompt_wav_path=self.voice.prompt_wav_path,
            prompt_text=self.voice.prompt_text,
            reference_wav_path=self.voice.reference_wav_path,
            cfg_value=self.voice.cfg_value,
            inference_timesteps=self.voice.inference_timesteps,
            min_len=self.voice.min_len,
            max_len=self.voice.max_len,
            normalize=self.voice.normalize,
            normalize_lang=self.voice.normalize_lang,
            denoise=self.voice.denoise,
        )

        try:
            if self.use_streaming:
                iterator = self.voxcpm.generate_streaming(**common_kwargs)
                pushed_any = False
                for chunk in iterator:
                    if self.stop_synthesis_event.is_set():
                        # Best-effort abort: drop remaining chunks. VoxCPM
                        # generator itself will be garbage-collected.
                        return False
                    self._enqueue_float(chunk)
                    pushed_any = True
                if not pushed_any:
                    # Edge case: empty input produced no chunks.
                    return True
            else:
                wav: np.ndarray = self.voxcpm.generate(**common_kwargs)
                if self.stop_synthesis_event.is_set():
                    return False
                self._enqueue_float(wav)
            return True
        except Exception:
            logger.exception("[VoxCPMEngine] synthesis failed for text=%r", text)
            return False

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    def _enqueue_float(self, wav: np.ndarray) -> None:
        """
        Convert a float32 mono waveform to PCM16 LE and enqueue.
        """
        if wav is None or wav.size == 0:
            return
        wav = np.asarray(wav, dtype=np.float32).reshape(-1)
        if self.apply_trim_silence:
            try:
                wav = self._trim_silence(wav, sample_rate=self._sample_rate)
            except Exception:
                logger.debug("trim_silence failed, using raw audio", exc_info=True)
        np.clip(wav, -1.0, 1.0, out=wav)
        pcm16 = (wav * 32767.0).astype(np.int16, copy=False)
        self.queue.put(pcm16.tobytes())
        self.audio_duration += pcm16.shape[0] / float(self._sample_rate)

    def shutdown(self) -> None:
        """
        Release engine resources. VoxCPM itself has no explicit shutdown,
        so this is mostly a no-op. Subclass users can override if needed.
        """
        self.stop_synthesis_event.set()
