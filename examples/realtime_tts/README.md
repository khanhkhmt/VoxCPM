# VoxCPM × RealtimeTTS

Integration example that plugs a local VoxCPM / VoxCPM2 model into the
[RealtimeTTS](https://github.com/KoljaB/RealtimeTTS) streaming pipeline.

You get to keep the VoxCPM model (voice cloning, tokenizer-free synthesis,
Vietnamese-ready normalization) while borrowing the RealtimeTTS
orchestration layer:

- `stream2sentence` tokenizer that yields sentences / fragments early
- Producer-consumer queues between synthesis and playback
- Fade-in / trim-silence helpers from `BaseEngine`
- Unified engine fallback (e.g. OpenAI or Elevenlabs when GPU is busy)

## Layout

```
examples/realtime_tts/
├── README.md          # this file
├── voxcpm_engine.py   # VoxCPMEngine + VoxCPMVoice adapter
├── demo.py            # end-to-end demo (live playback or save to WAV)
└── requirements.txt   # extra dependencies on top of VoxCPM
```

## Install

1. Install VoxCPM first (see repo root `README.md`).
2. Install the extra dependencies for this example:

   ```bash
   pip install -r examples/realtime_tts/requirements.txt
   ```

   RealtimeTTS pulls in `pyaudio`, which needs `portaudio19-dev` on
   Debian/Ubuntu:

   ```bash
   sudo apt-get install -y portaudio19-dev
   ```

   On a headless VM without a sound device you can still run the demo in
   "save to WAV" mode (see below) — the adapter only *imports* PyAudio's
   format constants, it does not require an output stream to exist.

## Quick start

### 1. Playback through default sound device

```bash
python examples/realtime_tts/demo.py \
    --text "Xin chào, đây là demo VoxCPM qua RealtimeTTS." \
    --reference-wav path/to/ref.wav
```

### 2. Headless / CI (write final audio to WAV)

```bash
python examples/realtime_tts/demo.py --save out.wav
```

### 3. Batch mode (non-streaming VoxCPM)

```bash
python examples/realtime_tts/demo.py --no-streaming --save out.wav
```

## Using `VoxCPMEngine` directly

```python
from voxcpm import VoxCPM
from examples.realtime_tts.voxcpm_engine import VoxCPMEngine, VoxCPMVoice
from RealtimeTTS import TextToAudioStream

voxcpm = VoxCPM.from_pretrained("openbmb/VoxCPM2")
voice = VoxCPMVoice(
    name="vi-female",
    reference_wav_path="assets/ref_vi.wav",
    cfg_value=2.0,
    inference_timesteps=10,
)
engine = VoxCPMEngine(voxcpm=voxcpm, voice=voice, use_streaming=True)

stream = TextToAudioStream(engine, tokenizer="nltk")
stream.feed("Xin chào, đây là bản demo. Nó có thể nói nhiều câu.")
stream.play()
```

The engine derives its sample rate from the active model
(`voxcpm.tts_model.sample_rate`), so it works transparently for VoxCPM
(16 kHz) and VoxCPM2 (24 / 48 kHz).

## API summary

### `VoxCPMVoice`

Dataclass configuring a single voice. Fields:

| Field | Purpose |
|-------|---------|
| `reference_wav_path` | V2 voice cloning reference WAV |
| `prompt_wav_path` + `prompt_text` | continuation prompt (both required if one is set) |
| `cfg_value` | CFG guidance scale (default 2.0) |
| `inference_timesteps` | DiT Euler steps (default 10) |
| `normalize` / `normalize_lang` | run VoxCPM text normalizer |
| `denoise` | run ZipEnhancer on prompt / reference |
| `min_len` / `max_len` | generator length bounds |

### `VoxCPMEngine`

Inherits `RealtimeTTS.engines.BaseEngine`. Methods of interest:

- `get_stream_info()` → `(paInt16, 1, sample_rate)`
- `set_voice(voice)` — accepts `VoxCPMVoice`, `dict`, or a reference-WAV path
- `set_voice_parameters(**fields)` — update scalar fields in place
- `synthesize(text, sentence_count)` — enqueue PCM16 LE bytes; called by
  the RealtimeTTS worker for each sentence
- `stop()` — inherited; flips `stop_synthesis_event` so the current
  synthesis loop exits at the next chunk boundary

### Streaming vs batch

- `use_streaming=True` (default) calls `VoxCPM.generate_streaming` and
  enqueues each yielded chunk immediately. Minimum TTFA.
- `use_streaming=False` calls `VoxCPM.generate` once per sentence and
  enqueues the full waveform.

## Caveats

- **Tokenizer**: `stream2sentence` uses NLTK / Stanza, neither of which
  is trained on Vietnamese. Sentence boundaries in pure VN text can be
  off. For production Vietnamese you may want a custom chunker (see the
  related prompts in the VoxCPM repo).
- **Prosody across sentences**: RealtimeTTS generates each sentence
  independently, so global prosody contour across sentence boundaries
  is lost. If you need continuous prosody, prefer `VoxCPM.generate`
  directly on the full text, or apply an audio-feedback bridge (see
  `voxcpm_word_chunk_feedback_PROMPT.md` and
  `voxcpm_pipelined_lookahead_PROMPT.md`).
- **PyAudio dependency**: RealtimeTTS imports PyAudio; the adapter only
  uses `pyaudio.paInt16` for the format constant and falls back to the
  numeric value (8) if `pyaudio` is missing, so the import works on
  servers without portaudio.
- **GPU concurrency**: VoxCPM runs on a single device; launching multiple
  parallel `TextToAudioStream` sessions will contend for the same GPU.
  Serialize with a semaphore / queue if you expect concurrent users.
