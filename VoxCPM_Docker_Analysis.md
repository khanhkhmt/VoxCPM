# Phân tích Dockerization cho VoxCPM (Next.js FE + FastAPI BE)

Repo: `Thanh25082005/VoxCPM` (fork của OpenBMB/VoxCPM — TTS 2B, tokenizer-free, đã được bổ sung FE Next.js + Prisma).

---

## 1. Hiện trạng repo

```
VoxCPM/
├── app.py                  # ⚠️ FastAPI (8808) + Gradio trong cùng 1 file
├── app_old.py              # Gradio cũ
├── lora_ft_webui.py        # Gradio UI cho LoRA fine-tune (1307 dòng)
├── pyproject.toml          # deps Python (bao gồm gradio, spaces, datasets, …)
├── src/voxcpm/             # ✅ Core library (KHÔNG import gradio)
│   ├── core.py, cli.py
│   ├── model/, modules/, training/, utils/, zipenhancer.py
├── scripts/                # train/finetune/infer test (không cần cho serving)
│   ├── train_voxcpm_finetune.py
│   ├── test_voxcpm_ft_infer.py
│   └── test_voxcpm_lora_infer.py
├── conf/                   # YAML train/LoRA (voxcpm_v1, v1.5, v2)
├── examples/               # wav mẫu + train_data_example.jsonl
├── assets/                 # logo, ảnh README
├── tests/                  # pytest
├── .gradio/                # file chứng chỉ Gradio
├── server.log              # log runtime lẫn vào repo
├── uv.lock                 # lock file uv (~1.1MB)
└── web/                    # ✅ Next.js 16 + React 19
    ├── package.json        # next, prisma 7, @libsql/client, @upstash/*, bcryptjs, jose, zod
    ├── prisma/schema.prisma # SQLite (libsql) — User/Session auth
    ├── src/app/
    │   ├── api/auth/*      # login/register/logout/captcha/me/change-password
    │   ├── studio/         # trang gọi TTS
    │   └── (auth)/login|register
    └── src/lib/tts.ts      # fetch('http://127.0.0.1:8808/api/tts/...')
```

### Kiến trúc runtime thực sự cần

| Layer | Thành phần bắt buộc | Cổng |
|---|---|---|
| BE inference | `app.py` (chỉ phần FastAPI ~dòng 330-469) + `src/voxcpm/*` | 8808 |
| FE web | `web/` (Next.js standalone) + SQLite (libsql file) | 3000 |
| Model weights | HF Hub `openbmb/VoxCPM2` + FunASR SenseVoice (cho `/api/tts/asr`) | volume |

FE gọi BE qua `NEXT_PUBLIC_TTS_API_BASE` (default `http://127.0.0.1:8808/api/tts`) trong `web/src/lib/tts.ts`.

---

## 2. Những thứ KHÔNG liên quan tới production (FE Next.js + BE FastAPI)

### 2.1 File/thư mục nên **loại khỏi Docker image BE** (dùng `.dockerignore`)

| Mục | Lý do |
|---|---|
| `app_old.py` | Gradio phiên bản cũ, không còn dùng |
| `lora_ft_webui.py` | Web UI riêng cho fine-tune LoRA (Gradio) — chỉ dùng cho training |
| `scripts/` | Script training / test CLI, không phục vụ inference |
| `conf/` | YAML cho fine-tune (voxcpm_v1, v1.5, v2) |
| `examples/` | Audio mẫu + `train_data_example.jsonl` |
| `tests/` | Unit tests, chỉ dùng khi dev |
| `.gradio/` | Certificate Gradio (share tunnel) |
| `assets/` | Logo/ảnh cho README, không cần runtime |
| `README*.md`, `Readme_run.md`, `LICENSE` | Docs |
| `.github/`, `.git/` | CI config, history |
| `server.log`, `*.log` | Log lỡ commit |
| `web/` | Không copy vào image BE (đã tách sang image FE riêng) |
| `uv.lock` | Chỉ cần ở builder stage, không cần ở runtime |
| `**/__pycache__`, `*.egg-info`, `.runtime/`, `.DS_Store` | rác |

### 2.2 Phần code trong `app.py` có thể tách bỏ để image mỏng hơn

`app.py` đang gộp 2 thứ: `VoxCPMDemo` (logic TTS, dùng chung) + toàn bộ UI Gradio (~dòng 1-329: `_USAGE_INSTRUCTIONS_*`, `_I18N_TRANSLATIONS`, `gr.I18n`, `gr.Blocks`, …). Chỉ phần từ comment `# ---------- FastAPI API ----------` (dòng ~330) trở xuống là cần cho BE.

**Khuyến nghị:** tách ra một file mới ví dụ `server.py` chỉ giữ:
- `VoxCPMDemo` (hoặc import từ module mới)
- FastAPI app + routes `/health`, `/api/tts/health`, `/api/tts/asr`, `/api/tts/generate`, `/api/tts/file/{name}`
- Entrypoint `uvicorn server:app`

Khi đó có thể xóa luôn `import gradio as gr` và toàn bộ string i18n → giảm ~2MB code + giảm đáng kể size image (gradio + deps nặng ~300MB).

### 2.3 Dependencies Python KHÔNG cần cho production BE

Trong `pyproject.toml` (`[project.dependencies]`):

| Package | Vai trò hiện tại | Đề xuất |
|---|---|---|
| `gradio>=6,<7` | UI Gradio trong `app.py`/`app_old.py`/`lora_ft_webui.py` | **BỎ** khi đã tách `server.py` |
| `spaces` | Decorator cho HuggingFace Spaces | **BỎ** (không deploy lên HF Spaces) |
| `datasets>=3,<4` | Load dataset training | **BỎ** cho runtime; chỉ cần ở image training |
| `modelscope>=1.22.0` | Mirror TQ cho model | **BỎ** nếu dùng HF Hub trực tiếp |
| `matplotlib` | Vẽ biểu đồ (training/debug) | **BỎ** |
| `argbind` | Arg parsing cho scripts training | **BỎ** |
| `funasr` | ASR cho endpoint `/api/tts/asr` (prompt_wav_recognition) | **GIỮ** (FE có dùng qua `useAsr`) hoặc làm optional nếu FE không cần ASR server-side |
| `wetext` | Text normalization (do_normalize) | **GIỮ** |
| `inflect`, `soundfile`, `librosa`, `safetensors`, `einops`, `addict`, `tqdm`, `simplejson`, `sortedcontainers` | Core inference | **GIỮ** |
| `torch`, `torchaudio`, `torchcodec`, `transformers`, `huggingface-hub`, `pydantic`, `python-multipart`, `fastapi`, `uvicorn` | Bắt buộc | **GIỮ** |

→ Việc cắt gradio/spaces/datasets/modelscope/matplotlib/argbind có thể giảm image BE **~500–800 MB** (uncompressed).

### 2.4 Phía FE (`web/`)

FE khá gọn, nhưng có vài điểm lưu ý khi Docker hóa:
- `@upstash/ratelimit` + `@upstash/redis` là **SaaS** (REST Redis) — nếu không có account Upstash, cần set env rỗng & code fallback, hoặc đổi sang Redis tự host.
- Prisma dùng `@libsql/client` (SQLite file) → phải mount **volume** cho file `.db` nếu không muốn mất user/session mỗi lần restart container.
- `test-prisma.ts`, `scripts/seed-admin.ts` chỉ cho dev → `.dockerignore` (trừ khi cần seed admin lần đầu trong entrypoint).
- `public/*.svg` mẫu của Next.js (`vercel.svg`, `next.svg`, `window.svg`, `file.svg`, `globe.svg`) có thể xóa để giảm size.
- `web/CLAUDE.md`, `web/AGENTS.md`, `web/README.md` → docs, dockerignore.

---

## 3. Chiến thuật Docker tối ưu

### 3.1 Nguyên tắc chung

1. **Tách 2 image**: `voxcpm-backend` (CUDA + Python) và `voxcpm-frontend` (Node Next.js). Mỗi image build/release độc lập, scale độc lập.
2. **Multi-stage build** cho cả 2: tách "builder" (gcc, build-essential, dev deps) khỏi "runtime" (chỉ cần lib binary + app).
3. **Non-root user**, **healthcheck**, **`.dockerignore` nghiêm ngặt**.
4. **Tách model weights khỏi image** → mount volume `/models` (HF cache). Image chỉ chứa code, không chứa ~5GB weights → build nhanh, push nhanh, cache tầng tốt.
5. **GPU**: dùng base `nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04` (hoặc `-devel` ở builder), khai báo `deploy.resources.reservations.devices` trong compose, hoặc `--gpus all` khi `docker run`.
6. **CPU fallback image** (tùy chọn): base `python:3.11-slim` + torch CPU wheel, dùng cho dev/demo không có GPU.
7. **Reverse proxy** (Caddy/Nginx/Traefik) ở ngoài làm TLS + route `/` → FE, `/api/tts` → BE; FE-to-BE nội bộ đi qua Docker network (`http://backend:8808`).

### 3.2 Backend `Dockerfile` (khuyến nghị)

```dockerfile
# ---------- Stage 1: builder ----------
FROM nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_SYSTEM_PYTHON=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3.11 python3.11-venv python3-pip \
      build-essential git ffmpeg libsndfile1 \
 && rm -rf /var/lib/apt/lists/*

RUN python3.11 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Cài torch bản CUDA trước để tận dụng layer cache
RUN pip install --upgrade pip && \
    pip install torch==2.4.1 torchaudio==2.4.1 torchcodec \
      --index-url https://download.pytorch.org/whl/cu121

WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
# Cài các deps ứng dụng (đã loại gradio, spaces, datasets, modelscope, matplotlib, argbind ở pyproject)
RUN pip install -e . --no-deps && \
    pip install fastapi uvicorn python-multipart transformers \
      einops inflect addict wetext huggingface-hub pydantic \
      tqdm simplejson sortedcontainers soundfile librosa \
      funasr safetensors

# ---------- Stage 2: runtime ----------
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04 AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/models/hf \
    HUGGINGFACE_HUB_CACHE=/models/hf/hub \
    TOKENIZERS_PARALLELISM=false \
    VOXCPM_MODEL_ID=openbmb/VoxCPM2 \
    PATH="/opt/venv/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3.11 ffmpeg libsndfile1 curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -r app && useradd -r -g app -d /app app

COPY --from=builder /opt/venv /opt/venv
WORKDIR /app
COPY --chown=app:app src ./src
COPY --chown=app:app server.py ./      # file mới chỉ chứa FastAPI (không Gradio)

USER app
EXPOSE 8808

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8808/api/tts/health || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8808", "--workers", "1"]
```

Ghi chú:
- `--workers 1`: mô hình đã chiếm GPU memory; muốn tăng throughput thì tăng replica container (mỗi container/GPU slot), không tăng workers trong cùng process.
- Nếu không tách `server.py`, có thể tạm thay `CMD` bằng `uvicorn app:app …` nhưng phải giữ `gradio` trong deps → image to hơn.
- Để pre-download model lúc build (tùy chọn, đánh đổi image size): `RUN python -c "from voxcpm.core import VoxCPM; VoxCPM.from_pretrained('openbmb/VoxCPM2')"`. Không khuyến nghị vì image tăng ~5GB; hãy dùng volume.

### 3.3 Frontend `Dockerfile` (Next.js 16 standalone)

Thêm `output: 'standalone'` vào `web/next.config.ts`.

```dockerfile
# ---------- Stage 1: deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci

# ---------- Stage 2: builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./
RUN npx prisma generate && npm run build

# ---------- Stage 3: runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

# Dùng entrypoint chạy prisma db push trước (idempotent) rồi start server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node server.js"]
```

### 3.4 `docker-compose.yml` tham khảo

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    image: voxcpm-backend:latest
    restart: unless-stopped
    environment:
      VOXCPM_MODEL_ID: openbmb/VoxCPM2
      HF_HOME: /models/hf
    volumes:
      - models:/models              # cache model (HF + FunASR)
      - runtime:/app/.runtime       # uploads + outputs
    ports:
      - "8808:8808"                 # có thể bỏ nếu đã có reverse proxy
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://127.0.0.1:8808/api/tts/health"]
      interval: 30s
      timeout: 5s
      retries: 10
      start_period: 300s            # cho warm-up model lần đầu

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    image: voxcpm-frontend:latest
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_TTS_API_BASE: http://backend:8808/api/tts
      DATABASE_URL: file:/data/app.db
      JWT_SECRET: ${JWT_SECRET}
      UPSTASH_REDIS_REST_URL: ${UPSTASH_REDIS_REST_URL:-}
      UPSTASH_REDIS_REST_TOKEN: ${UPSTASH_REDIS_REST_TOKEN:-}
    volumes:
      - web_db:/data
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "3000:3000"

volumes:
  models:
  runtime:
  web_db:
```

Lưu ý biến `NEXT_PUBLIC_*` được bake vào bundle lúc `next build` — vì vậy URL gọi BE **cần cố định ở thời điểm build** (ví dụ `/api/tts` đi qua reverse proxy cùng origin là an toàn nhất). Nếu muốn khác env khác URL, hãy đặt dưới reverse proxy và dùng `NEXT_PUBLIC_TTS_API_BASE=/api/tts`.

### 3.5 `.dockerignore` (root)

```
.git
.github
.gradio
.runtime
.venv
__pycache__
*.pyc
*.egg-info
*.log
node_modules
web/node_modules
web/.next
tests
scripts
conf
examples
assets
README*.md
Readme_run.md
LICENSE
app_old.py
lora_ft_webui.py
server.log
uv.lock
```

### 3.6 `.dockerignore` cho FE (`web/.dockerignore`)

```
node_modules
.next
.turbo
.env
.env.*
*.log
test-prisma.ts
scripts
CLAUDE.md
AGENTS.md
README.md
```

---

## 4. Tổng kết ưu tiên thực hiện

1. **Tách `server.py`** khỏi `app.py` (chỉ FastAPI, không Gradio). Cập nhật `CMD` và pyproject để chạy không cần gradio.
2. Dọn `pyproject.toml`: bỏ `gradio`, `spaces`, `datasets`, `modelscope`, `matplotlib`, `argbind` khỏi `[project.dependencies]`; nếu vẫn cần cho training/finetune, chuyển sang `[project.optional-dependencies].train`.
3. Thêm `output: 'standalone'` vào `web/next.config.ts`.
4. Viết 2 Dockerfile + `.dockerignore` + `docker-compose.yml` như mẫu trên.
5. Chạy lần đầu có `start_period` dài cho BE để download model; model sẽ persist ở volume `models`.
6. Đặt Caddy/Nginx phía trước cùng origin để FE dùng `NEXT_PUBLIC_TTS_API_BASE=/api/tts`, tránh CORS và tránh bake hostname vào bundle.
7. Cân nhắc: nếu muốn deploy nhiều replica BE, tách ASR (FunASR) ra microservice riêng hoặc tắt endpoint `/api/tts/asr` ở BE và làm ASR client-side.

---

## 5. Ước lượng kích thước image sau tối ưu

| Image | Base | Size (nén) | Ghi chú |
|---|---|---|---|
| voxcpm-backend (GPU) | nvidia/cuda 12.1 runtime | ~4.5–5.5 GB | torch cu121 + transformers + funasr |
| voxcpm-backend (CPU) | python:3.11-slim | ~1.8–2.2 GB | torch CPU wheel |
| voxcpm-frontend | node:20-alpine | ~180–220 MB | Next.js standalone + prisma client |

Model weights (~5 GB) nằm ở volume, không tính vào image size.
