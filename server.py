"""
VoxCPM FastAPI Server (Gradio-free)
====================================
Lightweight inference server exposing TTS endpoints only.
Extracted from app.py — no Gradio, no i18n strings, no training deps.

Usage:
    uvicorn server:app --host 0.0.0.0 --port 8808 --workers 1
    # or
    python server.py --port 8808
"""

import os
import sys
import logging
import uuid
import numpy as np
import soundfile as sf
import torch
import uvicorn
from typing import Optional, Tuple
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from funasr import AutoModel
from pathlib import Path

os.environ["TOKENIZERS_PARALLELISM"] = "false"

import voxcpm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


# ---------- Model ----------

class VoxCPMDemo:
    def __init__(self, model_id: str = "openbmb/VoxCPM2") -> None:
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Running on device: {self.device}")

        self.asr_model_id = "FunAudioLLM/SenseVoiceSmall"
        self.asr_model: Optional[AutoModel] = AutoModel(
            model=self.asr_model_id,
            disable_update=True,
            log_level="DEBUG",
            device="cuda:0" if self.device == "cuda" else "cpu",
            hub="hf",
        )

        self.voxcpm_model: Optional[voxcpm.VoxCPM] = None
        self._model_id = model_id

    def get_or_load_voxcpm(self) -> voxcpm.VoxCPM:
        if self.voxcpm_model is not None:
            return self.voxcpm_model
        logger.info(f"Loading model: {self._model_id} on {self.device}")
        self.voxcpm_model = voxcpm.VoxCPM.from_pretrained(self._model_id, optimize=False, device=self.device)
        logger.info("Model loaded successfully.")
        return self.voxcpm_model

    def prompt_wav_recognition(self, prompt_wav: Optional[str]) -> str:
        if prompt_wav is None:
            return ""
        res = self.asr_model.generate(input=prompt_wav, language="auto", use_itn=True)
        return res[0]["text"].split("|>")[-1]

    def _build_generate_kwargs(
        self,
        *,
        final_text: str,
        audio_path: Optional[str],
        prompt_text_clean: Optional[str],
        cfg_value_input: float,
        do_normalize: bool,
        denoise: bool,
        inference_timesteps: int = 10,
        normalize_lang: str = "auto",
    ) -> dict:
        generate_kwargs = dict(
            text=final_text,
            reference_wav_path=audio_path,
            cfg_value=float(cfg_value_input),
            inference_timesteps=inference_timesteps,
            normalize=do_normalize,
            normalize_lang=normalize_lang if normalize_lang != "auto" else None,
            denoise=denoise,
        )
        if prompt_text_clean and audio_path:
            generate_kwargs["prompt_wav_path"] = audio_path
            generate_kwargs["prompt_text"] = prompt_text_clean
        return generate_kwargs

    def generate_tts_audio(
        self,
        text_input: str,
        control_instruction: str = "",
        reference_wav_path_input: Optional[str] = None,
        prompt_text: str = "",
        cfg_value_input: float = 2.0,
        do_normalize: bool = True,
        denoise: bool = True,
        inference_timesteps: int = 10,
        normalize_lang: str = "auto",
    ) -> Tuple[int, np.ndarray]:
        current_model = self.get_or_load_voxcpm()

        text = (text_input or "").strip()
        if len(text) == 0:
            raise ValueError("Please input text to synthesize.")

        control = (control_instruction or "").strip()
        final_text = f"({control}){text}" if control else text

        audio_path = reference_wav_path_input if reference_wav_path_input else None
        prompt_text_clean = (prompt_text or "").strip() or None

        if audio_path and prompt_text_clean:
            logger.info(f"[Voice Cloning] prompt_wav + prompt_text + reference_wav")
        elif audio_path:
            logger.info(f"[Voice Control] reference_wav only")
        else:
            logger.info(f"[Voice Design] control: {control[:50] if control else 'None'}...")

        logger.info(f"Generating audio for text: '{final_text[:80]}...' [lang={normalize_lang}]")
        generate_kwargs = self._build_generate_kwargs(
            final_text=final_text,
            audio_path=audio_path,
            prompt_text_clean=prompt_text_clean,
            cfg_value_input=cfg_value_input,
            do_normalize=do_normalize,
            denoise=denoise,
            inference_timesteps=inference_timesteps,
            normalize_lang=normalize_lang,
        )
        wav = current_model.generate(**generate_kwargs)
        return (current_model.tts_model.sample_rate, wav)


# ---------- FastAPI API ----------

ROOT_DIR = Path(__file__).resolve().parent
RUNTIME_DIR = ROOT_DIR / ".runtime"
UPLOAD_DIR = RUNTIME_DIR / "uploads"
OUTPUT_DIR = RUNTIME_DIR / "outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def _to_bool(value: str, default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _save_upload(upload: UploadFile) -> Path:
    suffix = Path(upload.filename or "").suffix or ".wav"
    target = UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"
    with target.open("wb") as f:
        f.write(upload.file.read())
    return target


app = FastAPI(title="VoxCPM FastAPI", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_demo: Optional[VoxCPMDemo] = None


def get_demo() -> VoxCPMDemo:
    global _demo
    if _demo is None:
        model_id = os.environ.get("VOXCPM_MODEL_ID", "openbmb/VoxCPM2")
        _demo = VoxCPMDemo(model_id=model_id)
    return _demo


@app.get("/")
def root():
    return {"message": "VoxCPM FastAPI is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/tts/health")
def tts_health():
    return {"status": "ok"}


@app.post("/api/tts/asr")
def asr(reference_wav: UploadFile = File(...)):
    try:
        saved = _save_upload(reference_wav)
        text = get_demo().prompt_wav_recognition(str(saved))
        return {"text": text}
    except Exception as e:
        logger.exception("ASR failed")
        raise HTTPException(status_code=500, detail=f"ASR failed: {e}")


@app.post("/api/tts/generate")
def generate(
    text: str = Form(...),
    control_instruction: str = Form(""),
    use_prompt_text: str = Form("false"),
    prompt_text: str = Form(""),
    cfg_value: float = Form(2.0),
    do_normalize: str = Form("false"),
    denoise: str = Form("false"),
    dit_steps: int = Form(10),
    language: str = Form("auto"),
    reference_wav: Optional[UploadFile] = File(default=None),
):
    try:
        ref_path: Optional[str] = None
        if reference_wav is not None and reference_wav.filename:
            ref_path = str(_save_upload(reference_wav))

        ultimate = _to_bool(use_prompt_text, default=False)
        actual_prompt_text = prompt_text.strip() if ultimate else ""
        actual_control = "" if ultimate else (control_instruction or "")

        sr, wav_np = get_demo().generate_tts_audio(
            text_input=text,
            control_instruction=actual_control,
            reference_wav_path_input=ref_path,
            prompt_text=actual_prompt_text,
            cfg_value_input=float(cfg_value),
            do_normalize=_to_bool(do_normalize, default=False),
            denoise=_to_bool(denoise, default=False),
            inference_timesteps=int(dit_steps),
            normalize_lang=language,
        )

        out_name = f"{uuid.uuid4().hex}.wav"
        out_path = OUTPUT_DIR / out_name
        sf.write(out_path, wav_np, sr)

        return {
            "audio_url": f"/api/tts/file/{out_name}",
            "sample_rate": int(sr),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("TTS generation failed")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}")


@app.get("/api/tts/file/{file_name}")
def tts_file(file_name: str):
    file_path = OUTPUT_DIR / file_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=str(file_path), media_type="audio/wav", filename=file_name)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model-id", type=str, default="openbmb/VoxCPM2",
        help="Local path or HuggingFace repo ID (default: openbmb/VoxCPM2)",
    )
    parser.add_argument("--port", type=int, default=8808, help="Server port")
    args = parser.parse_args()

    os.environ["VOXCPM_MODEL_ID"] = args.model_id
    uvicorn.run("server:app", host="0.0.0.0", port=args.port, reload=False)
