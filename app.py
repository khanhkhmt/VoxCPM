import os
import sys
import logging
import uuid
import numpy as np
import soundfile as sf
import torch
import gradio as gr
import uvicorn
from typing import Optional, Tuple, Generator
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from funasr import AutoModel
from pathlib import Path
import threading
import queue
import asyncio
import base64
import tempfile
import json
import time
import re
import jwt

os.environ["TOKENIZERS_PARALLELISM"] = "false"

import voxcpm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# ---------- Inline i18n (en + zh-CN only) ----------

_USAGE_INSTRUCTIONS_EN = (
    "**Oriagent2 — Three Modes of Speech Generation:**\n\n"
    "🎨 **Voice Design** — Create a brand-new voice  \n"
    "No reference audio required. Describe the desired voice characteristics "
    "(gender, age, tone, emotion, pace …) in **Control Instruction**, and VoxCPM2 "
    "will craft a unique voice from your description alone.\n\n"
    "🎛️ **Controllable Cloning** — Clone a voice with optional style guidance  \n"
    "Upload a reference audio clip, then use **Control Instruction** to steer "
    "emotion, speaking pace, and overall style while preserving the original timbre.\n\n"
    "🎙️ **Ultimate Cloning** — Reproduce every vocal nuance through audio continuation  \n"
    "Turn on **Ultimate Cloning Mode** and provide (or auto-transcribe) the reference audio's transcript. "
    "The model treats the reference clip as a spoken prefix and seamlessly **continues** from it, faithfully preserving every vocal detail."
    "Note: This mode will disable Control Instruction."
)

_EXAMPLES_FOOTER_EN = (
    "---\n"
    "**💡 Voice Description Examples:**  \n"
    "Try the following Control Instructions to explore different voices:  \n\n"
    "**Example 1 — Gentle & Melancholic Girl**  \n"
    '`Control Instruction`: *"A young girl with a soft, sweet voice. '
    'Speaks slowly with a melancholic, slightly tsundere tone."*  \n'
    '`Target Text`: *"I never asked you to stay… It\'s not like I care or anything. '
    'But… why does it still hurt so much now that you\'re gone?"*  \n\n'
    "**Example 2 — Laid-Back Surfer Dude**  \n"
    '`Control Instruction`: *"Relaxed young male voice, slightly nasal, '
    'lazy drawl, very casual and chill."*  \n'
    '`Target Text`: *"Dude, did you see that set? The waves out there are totally gnarly today. '
    "Just catching barrels all morning — it's like, totally righteous, you know what I mean?\"*"
)

_USAGE_INSTRUCTIONS_ZH = (
    "**Oriagent2 — 三种语音生成方式：**\n\n"
    "🎨 **声音设计（Voice Design）**  \n"
    "无需参考音频。在 **Control Instruction** 中描述目标音色特征"
    "（性别、年龄、语气、情绪、语速等），Oriagent2 即可为你从零创造独一无二的声音。\n\n"
    "🎛️ **可控克隆（Controllable Cloning）**  \n"
    "上传参考音频，同时可选地使用 **Control Instruction** 来指定情绪、语速、风格等表达方式，"
    "在保留原始音色的基础上灵活控制说话风格。\n\n"
    "🎙️ **极致克隆（Ultimate Cloning）**  \n"
    "开启 **极致克隆模式** 并提供参考音频的文字内容（可自动识别）。"
    "模型会将参考音频视为已说出的前文，以**音频续写**的方式完整还原参考音频中的所有声音细节。"
    "注意：该模式与可控克隆模式互斥，将禁用Control Instruction。\n\n"
)

_EXAMPLES_FOOTER_ZH = (
    "---\n"
    "**💡 声音描述示例（中英文均可）：**  \n\n"
    "**示例 1 — 深宫太后**  \n"
    '`Control Instruction`: *"中老年女性，声音低沉阴冷，语速缓慢而有力，'
    '字字深思熟虑，带有深不可测的城府与威慑感。"*  \n'
    '`Target Text`: *"哀家在这深宫待了四十年，什么风浪没见过？你以为瞒得过哀家？"*  \n\n'
    "**示例 2 — 暴躁驾校教练**  \n"
    '`Control Instruction`: *"暴躁的中年男声，语速快，充满无奈和愤怒"*  \n'
    '`Target Text`: *"踩离合！踩刹车啊！你往哪儿开呢？前面是树你看不见吗？'
    '我教了你八百遍了，打死方向盘！你是不是想把车给我开到沟里去？"*  \n\n'
    "---\n"
    "**🗣️ 方言生成指南：**  \n"
    "要生成地道的方言语音，请在 **Target Text** 中直接使用方言词汇和句式，"
    "并在 **Control Instruction** 中描述方言特征。  \n\n"
    "**示例 — 广东话**  \n"
    '`Control Instruction`: *"粤语，中年男性，语气平淡"*  \n'
    '✅ 正确（粤语表达）：*"伙計，唔該一個A餐，凍奶茶少甜！"*  \n'
    '❌ 错误（普通话原文）：*"伙计，麻烦来一个A餐，冻奶茶少甜！"*  \n\n'
    "**示例 — 河南话**  \n"
    '`Control Instruction`: *"河南话，接地气的大叔"*  \n'
    '✅ 正确（河南话表达）：*"恁这是弄啥嘞？晌午吃啥饭？"*  \n'
    '❌ 错误（普通话原文）：*"你这是在干什么呢？中午吃什么饭？"*  \n\n'
    "🤖 **小技巧：** 不知道方言怎么写？可以用豆包、DeepSeek、Kimi 等 AI 助手"
    "将普通话翻译为方言文本，再粘贴到 Target Text 中即可。  \n\n"
)

_I18N_TRANSLATIONS = {
    "en": {
        "reference_audio_label": "🎤 Reference Audio (optional — upload for cloning)",
        "show_prompt_text_label": "🎙️ Ultimate Cloning Mode (transcript-guided cloning)",
        "show_prompt_text_info": "Auto-transcribes reference audio for every vocal nuance reproduced. Control Instruction will be disabled when active.",
        "prompt_text_label": "Transcript of Reference Audio (auto-filled via ASR, editable)",
        "prompt_text_placeholder": "The transcript of your reference audio will appear here …",
        "control_label": "🎛️ Control Instruction (optional — supports Chinese & English)",
        "control_placeholder": "e.g. A warm young woman / 年轻女性，温柔甜美 / Excited and fast-paced",
        "target_text_label": "✍️ Target Text — the content to speak",
        "generate_btn": "🔊 Generate Speech",
        "generated_audio_label": "Generated Audio",
        "advanced_settings_title": "⚙️ Advanced Settings",
        "ref_denoise_label": "Reference audio enhancement",
        "ref_denoise_info": "Apply ZipEnhancer denoising to the reference audio before cloning",
        "normalize_label": "Text normalization",
        "normalize_info": "Normalize numbers, dates, and abbreviations via wetext",
        "cfg_label": "CFG (guidance scale)",
        "cfg_info": "Higher → closer to the prompt / reference; lower → more creative variation",
        "dit_steps_label": "LocDiT flow-matching steps",
        "dit_steps_info": "LocDiT flow-matching steps — more steps → maybe better audio quality, but slower",
        "usage_instructions": _USAGE_INSTRUCTIONS_EN,
        "examples_footer": _EXAMPLES_FOOTER_EN,
    },
    "zh-CN": {
        "reference_audio_label": "🎤 参考音频（可选 — 上传后用于克隆）",
        "show_prompt_text_label": "🎙️ 极致克隆模式（基于文本引导的极致克隆）",
        "show_prompt_text_info": "自动识别参考音频文本，完整还原音色、节奏、情感等全部声音细节。开启后 Control Instruction 将暂时禁用",
        "prompt_text_label": "参考音频内容文本（ASR 自动填充，可手动编辑）",
        "prompt_text_placeholder": "参考音频的文字内容将自动识别并显示在此处 …",
        "control_label": "🎛️ Control Instruction（可选 — 支持中英文描述）",
        "control_placeholder": "如：年轻女性，温柔甜美 / A warm young woman / 暴躁老哥，语速飞快",
        "target_text_label": "✍️ Target Text — 要合成的目标文本",
        "generate_btn": "🔊 开始生成",
        "generated_audio_label": "生成结果",
        "advanced_settings_title": "⚙️ 高级设置",
        "ref_denoise_label": "参考音频降噪增强",
        "ref_denoise_info": "克隆前使用 ZipEnhancer 对参考音频进行降噪处理",
        "normalize_label": "文本规范化",
        "normalize_info": "自动规范化数字、日期及缩写（基于 wetext）",
        "cfg_label": "CFG（引导强度）",
        "cfg_info": "数值越高 → 越贴合提示/参考音色；数值越低 → 生成风格更自由",
        "dit_steps_label": "LocDiT 流匹配迭代步数",
        "dit_steps_info": "LocDiT 流匹配生成迭代步数 — 步数越多 → 可能生成更好的音频质量，但速度变慢",
        "usage_instructions": _USAGE_INSTRUCTIONS_ZH,
        "examples_footer": _EXAMPLES_FOOTER_ZH,
    },
    "zh-Hans": None,  # alias, filled below
    "zh": None,       # alias, filled below
}
_I18N_TRANSLATIONS["zh-Hans"] = _I18N_TRANSLATIONS["zh-CN"]
_I18N_TRANSLATIONS["zh"] = _I18N_TRANSLATIONS["zh-CN"]

for _d in _I18N_TRANSLATIONS.values():
    if _d is not None:
        for _k, _v in _I18N_TRANSLATIONS["en"].items():
            _d.setdefault(_k, _v)

I18N = gr.I18n(**_I18N_TRANSLATIONS)

DEFAULT_TARGET_TEXT = (
    "Oriagent2 is a creative multilingual TTS model from ModelBest, "
    "designed to generate highly realistic speech."
)

_CUSTOM_CSS = """
.logo-container {
    text-align: center;
    margin: 0.5rem 0 1rem 0;
}
.logo-container img {
    height: 80px;
    width: auto;
    max-width: 200px;
    display: inline-block;
}

/* Toggle switch style */
.switch-toggle {
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--block-background-fill);
}
.switch-toggle input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 44px;
    height: 24px;
    background: #ccc;
    border-radius: 12px;
    position: relative;
    cursor: pointer;
    transition: background 0.3s ease;
    flex-shrink: 0;
}
.switch-toggle input[type="checkbox"]::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.switch-toggle input[type="checkbox"]:checked {
    background: var(--color-accent);
}
.switch-toggle input[type="checkbox"]:checked::after {
    transform: translateX(20px);
}
"""

_APP_THEME = gr.themes.Soft(
    primary_hue="blue",
    secondary_hue="gray",
    neutral_hue="slate",
    font=[gr.themes.GoogleFont("Inter"), "Arial", "sans-serif"],
)


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

    def generate_streaming_tts_audio(
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
    ) -> Generator[np.ndarray, None, None]:
        current_model = self.get_or_load_voxcpm()

        text = (text_input or "").strip()
        if len(text) == 0:
            raise ValueError("Please input text to synthesize.")

        control = (control_instruction or "").strip()
        final_text = f"({control}){text}" if control else text

        audio_path = reference_wav_path_input if reference_wav_path_input else None
        prompt_text_clean = (prompt_text or "").strip() or None

        if audio_path and prompt_text_clean:
            logger.info(f"[Voice Cloning Streaming] prompt_wav + prompt_text + reference_wav")
        elif audio_path:
            logger.info(f"[Voice Control Streaming] reference_wav only")
        else:
            logger.info(f"[Voice Design Streaming] control: {control[:50] if control else 'None'}...")

        logger.info(f"Streaming audio for text: '{final_text[:80]}...' [lang={normalize_lang}]")
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
        return current_model.generate_streaming(**generate_kwargs)


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

allowed_origins_str = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [o.strip() for o in allowed_origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TTS_INTERNAL_SECRET = os.environ.get("TTS_INTERNAL_SECRET")

@app.middleware("http")
async def require_internal_secret(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/tts/") and not path.startswith("/api/tts/health") and not path.startswith("/api/tts/file/"):
        secret = request.headers.get("X-Internal-Secret")
        if not TTS_INTERNAL_SECRET or secret != TTS_INTERNAL_SECRET:
            logger.warning(f"Unauthorized access attempt to {path}")
            return JSONResponse(status_code=401, content={"detail": "Unauthorized: Invalid or missing X-Internal-Secret"})
    return await call_next(request)

_demo: Optional[VoxCPMDemo] = None
_inference_lock = threading.Lock()


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
    cfg_value: str = Form("2.0"),
    do_normalize: str = Form("false"),
    denoise: str = Form("false"),
    dit_steps: str = Form("10"),
    language: str = Form("auto"),
    reference_wav: Optional[UploadFile] = File(default=None),
):
    logger.info(
        f"[/api/tts/generate] received: text_len={len(text)}, cfg_value={cfg_value!r}, "
        f"dit_steps={dit_steps!r}, do_normalize={do_normalize!r}, denoise={denoise!r}, "
        f"use_prompt_text={use_prompt_text!r}, language={language!r}, "
        f"has_ref={reference_wav is not None and bool(reference_wav.filename)}"
    )
    try:
        if len(text) > 10000:
            raise ValueError("Text length exceeds maximum allowed (10000 characters).")

        # Defensive parsing: chấp nhận empty/invalid và fallback về default
        try:
            dit_steps_int = int(str(dit_steps).strip()) if str(dit_steps).strip() else 10
        except (ValueError, TypeError):
            dit_steps_int = 10
        try:
            cfg_value_f = float(str(cfg_value).strip()) if str(cfg_value).strip() else 2.0
        except (ValueError, TypeError):
            cfg_value_f = 2.0

        if not (1 <= dit_steps_int <= 50):
            raise ValueError("dit_steps must be between 1 and 50.")
        if not (0.1 <= cfg_value_f <= 10.0):
            raise ValueError("cfg_value must be between 0.1 and 10.0.")

        ref_path: Optional[str] = None
        if reference_wav is not None and reference_wav.filename:
            ref_path = str(_save_upload(reference_wav))

        ultimate = _to_bool(use_prompt_text, default=False)
        actual_prompt_text = prompt_text.strip() if ultimate else ""
        actual_control = "" if ultimate else (control_instruction or "")

        with _inference_lock:
            sr, wav_np = get_demo().generate_tts_audio(
                text_input=text,
                control_instruction=actual_control,
                reference_wav_path_input=ref_path,
                prompt_text=actual_prompt_text,
                cfg_value_input=cfg_value_f,
                do_normalize=_to_bool(do_normalize, default=False),
                denoise=_to_bool(denoise, default=False),
                inference_timesteps=dit_steps_int,
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
        logger.exception("TTS generation ValueError (returning 400)")
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


@app.delete("/api/tts/file/{file_name}")
def delete_tts_file(file_name: str):
    file_path = OUTPUT_DIR / file_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    file_path.unlink()
    logger.info(f"Deleted audio file: {file_name}")
    return {"ok": True}


def float32_to_pcm16_bytes(audio_np: np.ndarray) -> bytes:
    pcm16 = np.clip(audio_np, -1.0, 1.0) * 32767
    return pcm16.astype(np.int16).tobytes()

_CJK_RE = re.compile(r'[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]')


def _count_text_units(s: str) -> int:
    """Count text units in a language-aware way.
    For CJK characters, every ~2 characters counts as 1 unit (since CJK
    characters are denser than Latin words, fewer chars = same content).
    For Latin/other scripts, count whitespace-separated words.
    """
    cjk_count = len(_CJK_RE.findall(s))
    non_cjk = _CJK_RE.sub(' ', s)
    word_count = len(re.findall(r'\w+', non_cjk))
    return word_count + (cjk_count + 1) // 2


def split_text_into_segments(text: str, min_words: int = 4, max_words: int = 25) -> list[str]:
    if not text:
        return []
        
    for delim in [".", "?", "!", "。", "？", "！", "\n"]:
        text = text.replace(delim, delim + "|||")
        
    raw_segments = [s.strip() for s in text.split("|||") if s.strip()]

    refined_segments = []
    for seg in raw_segments:
        if _count_text_units(seg) > max_words:
            temp_seg = seg
            for delim in [",", ";", ":", "，", "、"]:
                temp_seg = temp_seg.replace(delim, delim + "###")
            sub_segs = [s.strip() for s in temp_seg.split("###") if s.strip()]
            refined_segments.extend(sub_segs)
        else:
            refined_segments.append(seg)
            
    final_segments = []
    current_seg = ""
    for seg in refined_segments:
        if not current_seg:
            current_seg = seg
        else:
            if _count_text_units(current_seg) < min_words and _count_text_units(current_seg + " " + seg) <= max_words:
                current_seg += " " + seg
            else:
                final_segments.append(current_seg)
                current_seg = seg
    
    if current_seg:
        final_segments.append(current_seg)
        
    absolute_final = []
    for seg in final_segments:
        if _count_text_units(seg) > max_words + 10:
            cjk_ratio = len(_CJK_RE.findall(seg)) / max(len(seg), 1)
            if cjk_ratio > 0.5:
                # CJK-dominant: split by character count
                max_chars = max_words * 2
                for start in range(0, len(seg), max_chars):
                    part = seg[start:start + max_chars].strip()
                    if part:
                        absolute_final.append(part)
            else:
                words = seg.split()
                chunk = []
                for w in words:
                    chunk.append(w)
                    if len(chunk) >= max_words:
                        absolute_final.append(" ".join(chunk))
                        chunk = []
                if chunk:
                    absolute_final.append(" ".join(chunk))
        else:
            absolute_final.append(seg)

    return absolute_final

@app.websocket("/ws/tts/stream")
async def streaming_tts(websocket: WebSocket):
    await websocket.accept()
    thread = None
    temp_wav_path = None
    cancel_event = threading.Event()
    q = queue.Queue()

    try:
        data = await websocket.receive_json()
        if data.get("type") != "start":
            await websocket.send_json({"type": "error", "message": "Expected start message."})
            await websocket.close()
            return

        text = data.get("text", "").strip()
        control_instruction = data.get("control_instruction", "")
        use_prompt_text = data.get("use_prompt_text", False)
        prompt_text = data.get("prompt_text", "")
        cfg_value = float(data.get("cfg_value", 2.0))
        do_normalize = data.get("do_normalize", True)
        denoise = data.get("denoise", True)
        dit_steps = int(data.get("dit_steps", 10))
        language = data.get("language", "auto")
        reference_wav_base64 = data.get("reference_wav_base64", None)

        if reference_wav_base64:
            if len(reference_wav_base64) > 5 * 1024 * 1024:
                await websocket.send_json({"type": "error", "message": "Reference audio base64 too large."})
                await websocket.close()
                return
            audio_bytes = base64.b64decode(reference_wav_base64)
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
            tmp.write(audio_bytes)
            tmp.close()
            temp_wav_path = tmp.name

        ultimate = use_prompt_text
        actual_prompt_text = prompt_text.strip() if ultimate else ""
        actual_control = "" if ultimate else (control_instruction or "")

        demo = get_demo()
        demo.get_or_load_voxcpm()
        sample_rate = demo.voxcpm_model.tts_model.sample_rate

        await websocket.send_json({
            "type": "start",
            "mode": "fast",
            "sample_rate": sample_rate,
            "format": "pcm16",
            "channels": 1
        })

        def run_generation():
            start_time = time.time()
            first_chunk_time = None
            chunks_count = 0
            all_chunks = []
            
            try:
                with _inference_lock:
                    generator = demo.generate_streaming_tts_audio(
                        text_input=text,
                        control_instruction=actual_control,
                        reference_wav_path_input=temp_wav_path,
                        prompt_text=actual_prompt_text,
                        cfg_value_input=cfg_value,
                        do_normalize=do_normalize,
                        denoise=denoise,
                        inference_timesteps=dit_steps,
                        normalize_lang=language,
                    )
                    
                    for chunk in generator:
                        if cancel_event.is_set():
                            q.put(("cancelled", None))
                            return
                        if first_chunk_time is None:
                            first_chunk_time = time.time()
                        
                        q.put(("chunk", chunk))
                        all_chunks.append(chunk)
                        chunks_count += 1
                if len(all_chunks) > 0:
                    final_wav_np = np.concatenate(all_chunks)
                    out_name = f"{uuid.uuid4().hex}.wav"
                    out_path = OUTPUT_DIR / out_name
                    sf.write(out_path, final_wav_np, sample_rate)
                    
                    ttfb_ms = int((first_chunk_time - start_time) * 1000) if first_chunk_time else 0
                    duration_ms = int(len(final_wav_np) / sample_rate * 1000)
                    
                    metadata = {
                        "type": "done",
                        "mode": "fast",
                        "audio_url": f"/api/tts/file/{out_name}",
                        "chunks": chunks_count,
                        "ttfb_ms": ttfb_ms,
                        "duration_ms": duration_ms
                    }
                    q.put(("done", metadata))
                else:
                    q.put(("error", "No audio generated."))
            except Exception as e:
                logger.exception("Streaming generation failed")
                q.put(("error", str(e)))

        thread = threading.Thread(target=run_generation, daemon=True)
        thread.start()

        while True:
            try:
                item_type, payload = await asyncio.wait_for(
                    asyncio.to_thread(q.get, timeout=2.0),
                    timeout=5.0,
                )
            except (asyncio.TimeoutError, Exception):
                if cancel_event.is_set():
                    break
                if not thread.is_alive():
                    break
                continue
            
            if item_type == "chunk":
                pcm16_bytes = float32_to_pcm16_bytes(payload)
                await websocket.send_bytes(pcm16_bytes)
            elif item_type in ("segment_start", "segment_done"):
                await websocket.send_json(payload)
            elif item_type == "done":
                await websocket.send_json(payload)
                break
            elif item_type == "error":
                await websocket.send_json({"type": "error", "message": payload})
                break
            elif item_type == "cancelled":
                try:
                    await websocket.send_json({"type": "cancelled"})
                except Exception:
                    pass
                break

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected by client.")
        cancel_event.set()
    except Exception as e:
        logger.exception("WebSocket stream error")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
        cancel_event.set()
    finally:
        cancel_event.set()
        if thread is not None:
            thread.join(timeout=30)
        if temp_wav_path and os.path.exists(temp_wav_path):
            try:
                os.unlink(temp_wav_path)
            except OSError:
                pass
        try:
            await websocket.close()
        except Exception:
            pass


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
    uvicorn.run("app:app", host="0.0.0.0", port=args.port, reload=False)
