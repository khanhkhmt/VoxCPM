"""
End-to-end demo: RealtimeTTS pipeline driven by VoxCPM.

Run modes:
    python demo.py                    # play audio through default sound device
    python demo.py --save out.wav     # write final audio to WAV instead
    python demo.py --stream-save      # print per-chunk timing (no playback)

The script loads a VoxCPM model, wraps it with `VoxCPMEngine`, feeds a
multi-sentence paragraph to `TextToAudioStream`, and lets RealtimeTTS
chunk -> synthesize -> play.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
import time
import wave
from typing import Optional

import numpy as np

from voxcpm import VoxCPM

# Make the adapter importable when running as a script from this directory.
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
if _THIS_DIR not in sys.path:
    sys.path.insert(0, _THIS_DIR)

from voxcpm_engine import VoxCPMEngine, VoxCPMVoice  # noqa: E402

DEFAULT_TEXT = (
    "Xin chào các bạn, đây là bản demo tích hợp VoxCPM với RealtimeTTS. "
    "Văn bản này sẽ được chia thành từng câu, và mỗi câu được tổng hợp "
    "theo luồng để giảm độ trễ khởi đầu. Hy vọng các bạn thấy thú vị."
)


def build_engine(
    model_id: str,
    reference_wav: Optional[str],
    use_streaming: bool,
    device: Optional[str],
) -> VoxCPMEngine:
    logging.info("Loading VoxCPM model %s ...", model_id)
    t0 = time.monotonic()
    voxcpm = VoxCPM.from_pretrained(
        hf_model_id=model_id,
        load_denoiser=False,       # keep demo light
        optimize=False,            # avoid long torch.compile warmup in demo
        device=device,
    )
    logging.info("VoxCPM loaded in %.1fs", time.monotonic() - t0)

    voice = VoxCPMVoice(
        name="demo",
        reference_wav_path=reference_wav,
        cfg_value=2.0,
        inference_timesteps=10,
    )
    return VoxCPMEngine(
        voxcpm=voxcpm,
        voice=voice,
        use_streaming=use_streaming,
        debug=True,
    )


def run_live_playback(engine: VoxCPMEngine, text: str) -> None:
    from RealtimeTTS import TextToAudioStream  # deferred: imports pyaudio
    stream = TextToAudioStream(
        engine,
        log_characters=True,
        tokenizer="nltk",
    )
    logging.info("Feeding text and starting playback...")
    stream.feed(text)
    stream.play(log_synthesized_text=True)
    logging.info("Playback finished.")


def run_chunk_collector(
    engine: VoxCPMEngine,
    text: str,
    save_path: Optional[str],
) -> None:
    """
    Drain `engine.queue` manually (no sound device needed) and optionally
    write the concatenated audio to a WAV file. Useful on headless servers.
    """
    from RealtimeTTS import TextToAudioStream
    from threading import Thread

    pcm_bytes = bytearray()
    first_chunk_at: dict[str, float] = {}

    def drain() -> None:
        while True:
            item = engine.queue.get()
            if item is None:
                break
            if "t" not in first_chunk_at:
                first_chunk_at["t"] = time.monotonic()
            pcm_bytes.extend(item)

    drain_thread = Thread(target=drain, daemon=True)
    drain_thread.start()

    start = time.monotonic()

    def on_audio_end():
        engine.queue.put(None)

    stream = TextToAudioStream(
        engine,
        muted=True,
        output_device_index=None,
        on_audio_stream_stop=on_audio_end,
        tokenizer="nltk",
    )
    stream.feed(text)
    stream.play(muted=True, log_synthesized_text=True)
    drain_thread.join(timeout=120)

    total = time.monotonic() - start
    ttfa = first_chunk_at.get("t", start) - start
    logging.info("TTFA=%.2fs total=%.2fs audio_bytes=%d", ttfa, total, len(pcm_bytes))

    if save_path:
        _, _, sample_rate = engine.get_stream_info()
        with wave.open(save_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)  # paInt16
            wf.setframerate(sample_rate)
            wf.writeframes(bytes(pcm_bytes))
        logging.info("Saved %s (%d samples @ %d Hz)", save_path,
                     len(pcm_bytes) // 2, sample_rate)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-id", default=os.environ.get(
        "VOXCPM_MODEL_ID", "openbmb/VoxCPM2"))
    parser.add_argument("--text", default=DEFAULT_TEXT)
    parser.add_argument("--reference-wav", default=None,
                        help="Optional reference WAV for voice cloning (V2 only).")
    parser.add_argument("--save", default=None,
                        help="If set, run headless and write final audio here.")
    parser.add_argument("--no-streaming", action="store_true",
                        help="Disable VoxCPM streaming (use batch generate).")
    parser.add_argument("--device", default=None,
                        help="Override device (cuda / cpu / mps).")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()

    logging.basicConfig(
        level=args.log_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    engine = build_engine(
        model_id=args.model_id,
        reference_wav=args.reference_wav,
        use_streaming=not args.no_streaming,
        device=args.device,
    )

    try:
        if args.save:
            run_chunk_collector(engine, args.text, save_path=args.save)
        else:
            run_live_playback(engine, args.text)
    finally:
        engine.shutdown()


if __name__ == "__main__":
    main()
