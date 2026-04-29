"""
Smoke test for VoxCPMEngine adapter.

Exercises the engine interface with a mock VoxCPM that emits a known
waveform. Does NOT require a GPU, model weights, or a sound device.
"""
from __future__ import annotations

import os
import sys
import types
import numpy as np

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
if _THIS_DIR not in sys.path:
    sys.path.insert(0, _THIS_DIR)

from voxcpm_engine import VoxCPMEngine, VoxCPMVoice  # noqa: E402


class _FakeTTSModel:
    sample_rate = 16000


class _FakeVoxCPM:
    """
    Mimics the public interface we rely on from `voxcpm.VoxCPM`:
      - `tts_model.sample_rate`
      - `generate(**kwargs) -> np.ndarray`
      - `generate_streaming(**kwargs) -> Iterable[np.ndarray]`
    """

    def __init__(self, sample_rate: int = 16000):
        self.tts_model = _FakeTTSModel()
        self.tts_model.sample_rate = sample_rate
        self.last_kwargs: dict = {}

    def generate(self, **kwargs):
        self.last_kwargs = kwargs
        # 1 second of 440Hz sine, amplitude 0.3
        sr = self.tts_model.sample_rate
        t = np.arange(sr, dtype=np.float32) / sr
        return (0.3 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)

    def generate_streaming(self, **kwargs):
        self.last_kwargs = kwargs
        sr = self.tts_model.sample_rate
        # 3 chunks of 100ms each
        for i in range(3):
            start = i * sr // 10
            end = (i + 1) * sr // 10
            t = np.arange(start, end, dtype=np.float32) / sr
            yield (0.3 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)


def test_stream_info():
    voxcpm = _FakeVoxCPM(sample_rate=24000)
    engine = VoxCPMEngine(voxcpm=voxcpm, use_streaming=False)
    fmt, channels, rate = engine.get_stream_info()
    assert channels == 1, channels
    assert rate == 24000, rate
    print("[pass] get_stream_info returns (%r, %d, %d)" % (fmt, channels, rate))


def test_voice_set_variants():
    voxcpm = _FakeVoxCPM()
    engine = VoxCPMEngine(voxcpm=voxcpm)
    # string -> wraps in VoxCPMVoice
    engine.set_voice("/tmp/ref.wav")
    assert engine.voice.reference_wav_path == "/tmp/ref.wav"
    # dict -> builds VoxCPMVoice
    engine.set_voice({"name": "v2", "cfg_value": 1.5})
    assert engine.voice.name == "v2" and engine.voice.cfg_value == 1.5
    # VoxCPMVoice instance
    vc = VoxCPMVoice(name="vc", cfg_value=3.0)
    engine.set_voice(vc)
    assert engine.voice is vc
    print("[pass] set_voice accepts str / dict / VoxCPMVoice")


def test_synthesize_batch():
    voxcpm = _FakeVoxCPM(sample_rate=16000)
    engine = VoxCPMEngine(voxcpm=voxcpm, use_streaming=False, debug=True)
    ok = engine.synthesize("Xin chào các bạn.", sentence_count=1)
    assert ok is True
    # 1 chunk enqueued (batch)
    assert engine.queue.qsize() == 1
    chunk = engine.queue.get_nowait()
    # 16000 samples * 2 bytes = 32000 bytes
    assert len(chunk) == 32000, len(chunk)
    # Verify int16 PCM
    pcm = np.frombuffer(chunk, dtype=np.int16)
    assert pcm.shape == (16000,)
    assert np.abs(pcm).max() > 1000  # non-silent
    print("[pass] batch synthesize produced 1 chunk of 32000 bytes PCM16")


def test_synthesize_streaming():
    voxcpm = _FakeVoxCPM(sample_rate=16000)
    engine = VoxCPMEngine(voxcpm=voxcpm, use_streaming=True, debug=True)
    ok = engine.synthesize("Câu streaming nhiều chunk.", sentence_count=0)
    assert ok is True
    # Expect 3 chunks (streaming mock yields 3)
    assert engine.queue.qsize() == 3, engine.queue.qsize()
    total_bytes = 0
    while not engine.queue.empty():
        total_bytes += len(engine.queue.get_nowait())
    # 3 chunks of 100ms @ 16kHz = 4800 samples * 2 bytes = 9600 bytes total
    assert total_bytes == 9600, total_bytes
    print("[pass] streaming synthesize produced 3 chunks totaling 9600 bytes")


def test_voice_parameter_propagation():
    voxcpm = _FakeVoxCPM()
    voice = VoxCPMVoice(
        name="test",
        cfg_value=1.7,
        inference_timesteps=15,
        normalize=True,
        normalize_lang="vi",
    )
    engine = VoxCPMEngine(voxcpm=voxcpm, voice=voice, use_streaming=False)
    engine.synthesize("Kiểm tra.")
    kw = voxcpm.last_kwargs
    assert kw["cfg_value"] == 1.7
    assert kw["inference_timesteps"] == 15
    assert kw["normalize"] is True
    assert kw["normalize_lang"] == "vi"
    print("[pass] voice params propagated to VoxCPM.generate kwargs")


def test_stop_event_aborts_streaming():
    """
    BaseEngine.synthesize clears stop_synthesis_event on entry, so stop()
    must be called DURING synthesis. Simulate that by having the mocked
    streaming generator flip the flag mid-yield.
    """
    voxcpm = _FakeVoxCPM()
    engine = VoxCPMEngine(voxcpm=voxcpm, use_streaming=True)

    sr = voxcpm.tts_model.sample_rate

    def stopping_stream(**_kwargs):
        yield (0.1 * np.ones(sr // 10, dtype=np.float32))
        engine.stop()  # flip the flag before the next yield
        yield (0.1 * np.ones(sr // 10, dtype=np.float32))
        yield (0.1 * np.ones(sr // 10, dtype=np.float32))

    voxcpm.generate_streaming = stopping_stream  # type: ignore[assignment]

    ok = engine.synthesize("abort test")
    # First chunk is enqueued, then the stop event causes an early return.
    assert ok is False
    assert engine.queue.qsize() == 1, engine.queue.qsize()
    print("[pass] stop() during synthesis aborts after the current chunk")


def test_voice_post_init_validation():
    try:
        VoxCPMVoice(prompt_wav_path="x.wav")  # missing prompt_text
    except ValueError as e:
        print("[pass] VoxCPMVoice rejected incomplete prompt config: %s" % e)
        return
    raise AssertionError("Expected ValueError for missing prompt_text")


def main():
    test_stream_info()
    test_voice_set_variants()
    test_synthesize_batch()
    test_synthesize_streaming()
    test_voice_parameter_propagation()
    test_stop_event_aborts_streaming()
    test_voice_post_init_validation()
    print("\nAll smoke tests passed.")


if __name__ == "__main__":
    main()
