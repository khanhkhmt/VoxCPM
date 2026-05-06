# Hướng dẫn chạy VoxCPM - Nhánh `feature_fixbug`

> Tài liệu này hướng dẫn chi tiết cách cài đặt và chạy toàn bộ project VoxCPM (Backend + Frontend), bao gồm các lưu ý về lỗi đã được phát hiện và sửa trong nhánh này.

---

## Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Clone project](#2-clone-project)
3. [Cài đặt Backend (Python/FastAPI)](#3-cài-đặt-backend-pythonfastapi)
4. [Cài đặt Frontend (Next.js)](#4-cài-đặt-frontend-nextjs)
5. [Cấu hình biến môi trường](#5-cấu-hình-biến-môi-trường)
6. [Chạy project](#6-chạy-project)
7. [Kiểm tra hoạt động](#7-kiểm-tra-hoạt-động)
8. [Các lỗi đã fix trong nhánh này](#8-các-lỗi-đã-fix-trong-nhánh-này)
9. [Troubleshooting - Xử lý lỗi thường gặp](#9-troubleshooting---xử-lý-lỗi-thường-gặp)

---

## 1. Yêu cầu hệ thống

| Thành phần       | Yêu cầu tối thiểu                              |
|-------------------|------------------------------------------------|
| **OS**           | Linux (Ubuntu 20.04+), macOS, Windows (WSL2)    |
| **Python**       | >= 3.10, < 3.13                                 |
| **Node.js**      | >= 18.x (khuyến nghị 20.x LTS)                 |
| **CUDA**         | >= 12.0 (bắt buộc cho GPU inference)            |
| **GPU VRAM**     | >= 8 GB (VoxCPM2), >= 6 GB (VoxCPM1.5)         |
| **RAM**          | >= 16 GB                                        |
| **Disk**         | >= 20 GB (cho model weights + dependencies)     |

> **Lưu ý:** Nếu không có GPU NVIDIA với CUDA, bạn vẫn có thể chạy trên CPU nhưng tốc độ sẽ rất chậm (RTF > 10x).

---

## 2. Clone project

```bash
git clone -b feature_fixbug --single-branch https://github.com/Thanh25082005/VoxCPM.git
cd VoxCPM
```

---

## 3. Cài đặt Backend (Python/FastAPI)

### 3.1 Tạo virtual environment

```bash
python3 -m venv venv
source venv/bin/activate   # Linux/macOS
# hoặc: venv\Scripts\activate  # Windows
```

### 3.2 Cài đặt dependencies

```bash
# Cài PyTorch trước (chọn phiên bản phù hợp CUDA)
# Ví dụ cho CUDA 12.4:
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124

# Cài VoxCPM và tất cả dependencies
pip install -e .
```

### 3.3 Cài thêm các package bổ sung cho backend server

```bash
pip install PyJWT python-multipart
```

### 3.4 Tải model weights

Model sẽ tự động tải từ HuggingFace khi chạy lần đầu tiên. Nếu muốn tải trước:

```bash
# Tải từ HuggingFace
python -c "from huggingface_hub import snapshot_download; snapshot_download('openbmb/VoxCPM2', local_dir='./pretrained_models/VoxCPM2')"

# Hoặc tải từ ModelScope (nếu ở Trung Quốc)
pip install modelscope
python -c "from modelscope import snapshot_download; snapshot_download('OpenBMB/VoxCPM2', local_dir='./pretrained_models/VoxCPM2')"
```

---

## 4. Cài đặt Frontend (Next.js)

### 4.1 Cài dependencies

```bash
cd web
npm install
```

### 4.2 Khởi tạo database

Frontend sử dụng SQLite qua Prisma cho user authentication:

```bash
# Generate Prisma client
npx prisma generate

# Tạo database và chạy migration
npx prisma migrate dev --name init
```

### 4.3 Quay lại thư mục gốc

```bash
cd ..
```

---

## 5. Cấu hình biến môi trường

### 5.1 Backend (FastAPI)

Backend đọc biến môi trường trực tiếp. Tạo file `.env` ở thư mục gốc hoặc export trước khi chạy:

```bash
# Bắt buộc — phải khớp với giá trị bên Frontend
export TTS_INTERNAL_SECRET="dev-internal-secret-change-me"

# Tùy chọn — đường dẫn model (mặc định: tự tải từ HuggingFace)
export VOXCPM_MODEL_ID="openbmb/VoxCPM2"
# Hoặc dùng model đã tải sẵn:
# export VOXCPM_MODEL_ID="./pretrained_models/VoxCPM2"
```

### 5.2 Frontend (Next.js)

Tạo file `web/.env.local` từ template:

```bash
cp web/.env.example web/.env.local
```

Nội dung file `web/.env.local`:

```env
# Database (SQLite local)
DATABASE_URL="file:./prisma/dev.db"

# JWT secret cho user sessions
AUTH_JWT_SECRET="change-me-in-production"

# URL backend FastAPI
NEXT_PUBLIC_TTS_API_BASE="http://127.0.0.1:8808/api/tts"

# Internal secret — PHẢI KHỚP với backend TTS_INTERNAL_SECRET
TTS_INTERNAL_SECRET="dev-internal-secret-change-me"

# Cloudflare R2 (tùy chọn — nếu để trống thì History/Voice Library không lưu được)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""
```

> **QUAN TRỌNG:** `TTS_INTERNAL_SECRET` ở Frontend và Backend **phải giống nhau**. Nếu không khớp:
> - Tất cả API calls sẽ trả về `401 Unauthorized`
> - Streaming WebSocket sẽ bị reject token
> - History save sẽ không hoạt động

---

## 6. Chạy project

### 6.1 Chạy Backend

```bash
# Từ thư mục gốc VoxCPM, với virtual environment đã activate
export TTS_INTERNAL_SECRET="dev-internal-secret-change-me"

# Chạy với model từ HuggingFace (tự động tải):
python app.py --port 8808

# Hoặc chạy với model local:
python app.py --model-id ./pretrained_models/VoxCPM2 --port 8808
```

Backend sẽ khởi động tại `http://0.0.0.0:8808`. Lần đầu chạy sẽ mất vài phút để:
1. Tải model weights (~8GB) nếu chưa có local
2. Load model lên GPU/CPU
3. Khởi tạo Gradio demo + FastAPI server

Khi thấy log `Uvicorn running on http://0.0.0.0:8808` là backend đã sẵn sàng.

### 6.2 Chạy Frontend

Mở terminal mới:

```bash
cd web
npm run dev
```

Frontend sẽ chạy tại `http://localhost:3000`.

### 6.3 Chạy cả hai (nhanh)

Nếu muốn chạy nhanh cả hai trong 2 terminal:

**Terminal 1 — Backend:**
```bash
cd /path/to/VoxCPM
source venv/bin/activate
export TTS_INTERNAL_SECRET="dev-internal-secret-change-me"
python app.py --port 8808
```

**Terminal 2 — Frontend:**
```bash
cd /path/to/VoxCPM/web
npm run dev
```

---

## 7. Kiểm tra hoạt động

### 7.1 Kiểm tra Backend health

```bash
curl http://127.0.0.1:8808/health
# Kết quả mong đợi: {"status":"ok"}

curl http://127.0.0.1:8808/api/tts/health
# Kết quả mong đợi: {"status":"ok"}
```

### 7.2 Kiểm tra Gradio Demo

Mở trình duyệt: `http://localhost:8808` — sẽ thấy giao diện Gradio demo.

### 7.3 Kiểm tra Frontend Studio

Mở trình duyệt: `http://localhost:3000` — đăng ký tài khoản hoặc đăng nhập, vào Studio để sử dụng.

### 7.4 Test nhanh bằng Python

```python
from voxcpm import VoxCPM
import soundfile as sf

model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False)
wav = model.generate(
    text="Xin chào, đây là bài test VoxCPM.",
    cfg_value=2.0,
    inference_timesteps=10,
)
sf.write("test.wav", wav, model.tts_model.sample_rate)
print("OK - saved test.wav")
```

---

## 8. Các lỗi đã fix trong nhánh này

Nhánh `feature_fixbug` (và PR #11) đã sửa 8 lỗi trong luồng streaming TTS:

### 8.1 Lỗi CRITICAL

| # | Lỗi | Mô tả | File |
|---|------|--------|------|
| 1 | **KV Cache corruption khi concurrent** | Model singleton dùng chung KV cache (`batch_size=1`). Nhiều request đồng thời ghi đè cache → audio rác hoặc crash. **Fix:** Thêm `threading.Lock` bảo vệ tất cả inference calls. | `app.py` |
| 2 | **Voice discontinuity trong Stable mode** | Mỗi segment text được generate hoàn toàn độc lập → giọng nói, nhịp điệu thay đổi giữa các câu. **Fix:** Generate toàn bộ text cùng lúc, sau đó chia audio theo tỷ lệ cho từng segment. | `app.py` |
| 3 | **WebSocket block vô hạn khi client disconnect** | `queue.get()` không có timeout → khi client đóng kết nối, server vẫn đợi generation thread mãi mãi, lãng phí GPU. **Fix:** Thêm timeout cho `q.get()` + `asyncio.wait_for()`. | `app.py` |

### 8.2 Lỗi HIGH

| # | Lỗi | Mô tả | File |
|---|------|--------|------|
| 4 | **TTFB đo sai** | Frontend đo TTFB khi nhận metadata "start" (trước khi generate), không phải khi nhận audio byte đầu tiên. **Fix:** Đo TTFB tại `onAudioChunk` đầu tiên + sử dụng backend TTFB từ message "done". | `StreamingTTSPanel.tsx` |
| 5 | **dit_steps bị cap ngầm** | Streaming mode luôn cap `dit_steps` xuống 4 mà không thông báo user. **Fix:** Hiển thị thông báo amber khi dit_steps bị cap. | `StreamingTTSPanel.tsx` |
| 6 | **Thread không được join** | Generation thread không bao giờ được join → zombie threads tích lũy. **Fix:** Thread đánh dấu `daemon=True` + `join(timeout=30)` trong `finally`. | `app.py` |

### 8.3 Lỗi MEDIUM

| # | Lỗi | Mô tả | File |
|---|------|--------|------|
| 7 | **CJK text segmentation sai** | `count_words()` đếm mỗi ký tự CJK là 1 "word" → segment quá ngắn cho tiếng Trung/Nhật/Hàn. **Fix:** Thêm `_count_text_units()` nhận biết CJK + fallback split theo character count. | `app.py` |
| 8 | **Backend TTFB không được sử dụng** | Backend tính TTFB chính xác nhưng frontend bỏ qua. **Fix:** Frontend sử dụng `ttfb_ms` từ "done" message. | `StreamingTTSPanel.tsx` |

---

## 9. Troubleshooting - Xử lý lỗi thường gặp

### 9.1 Backend không khởi động

**Lỗi: `ModuleNotFoundError: No module named 'voxcpm'`**
```bash
# Đảm bảo đã cài ở editable mode
pip install -e .
```

**Lỗi: `CUDA out of memory`**
- VoxCPM2 cần ~8GB VRAM. Đóng các ứng dụng khác đang dùng GPU.
- Hoặc dùng VoxCPM1.5 (cần ~6GB): `python app.py --model-id openbmb/VoxCPM1.5`
- Kiểm tra VRAM: `nvidia-smi`

**Lỗi: `RuntimeError: No CUDA GPUs are available`**
- Kiểm tra driver NVIDIA: `nvidia-smi`
- Kiểm tra PyTorch CUDA: `python -c "import torch; print(torch.cuda.is_available())"`
- Nếu `False`: cài lại PyTorch với CUDA: `pip install torch --index-url https://download.pytorch.org/whl/cu124`

### 9.2 Frontend không kết nối được Backend

**Lỗi: `401 Unauthorized` khi generate**
- Kiểm tra `TTS_INTERNAL_SECRET` trong `web/.env.local` và biến môi trường backend **phải giống nhau**.
- Restart cả backend và frontend sau khi sửa.

**Lỗi: `ECONNREFUSED 127.0.0.1:8808`**
- Backend chưa chạy hoặc chưa sẵn sàng. Đợi cho đến khi thấy log `Uvicorn running`.
- Kiểm tra `NEXT_PUBLIC_TTS_API_BASE` trong `web/.env.local`.

### 9.3 Streaming không hoạt động

**WebSocket bị reject token**
- `TTS_INTERNAL_SECRET` phải được set ở cả hai phía.
- Kiểm tra log backend: nếu thấy `Unauthorized: Invalid token`, secret không khớp.

**Audio bị giật/rè trong Fast mode**
- GPU yếu có thể không generate kịp real-time.
- Thử chuyển sang **Stable mode** (ổn định hơn, audio mượt hơn).
- Giảm `dit_steps` xuống 2-4 (streaming tự cap ở 4).

**Audio không tự nhiên / giọng thay đổi giữa các câu**
- Đây là lỗi đã được fix trong nhánh này (bug #2). Đảm bảo bạn đang dùng code mới nhất.
- Trong Stable mode, toàn bộ text giờ được generate cùng lúc để đảm bảo voice consistency.

### 9.4 Database / Authentication

**Lỗi: `PrismaClientInitializationError`**
```bash
cd web
npx prisma generate
npx prisma migrate dev --name init
```

**Quên mật khẩu admin**
- Database ở `web/prisma/dev.db`. Xóa file này và chạy lại migration để tạo database mới:
```bash
rm web/prisma/dev.db
cd web && npx prisma migrate dev --name init
```

### 9.5 Model tải chậm / lỗi tải

**Lỗi timeout khi tải model từ HuggingFace**
```bash
# Tải model trước bằng CLI
pip install huggingface-hub
huggingface-cli download openbmb/VoxCPM2 --local-dir ./pretrained_models/VoxCPM2

# Sau đó chạy với model local
python app.py --model-id ./pretrained_models/VoxCPM2
```

**Dùng mirror ModelScope (nếu ở Trung Quốc)**
```bash
pip install modelscope
python -c "from modelscope import snapshot_download; snapshot_download('OpenBMB/VoxCPM2', local_dir='./pretrained_models/VoxCPM2')"
```

### 9.6 Concurrent requests

**Nhiều người dùng cùng lúc bị chậm**
- `_inference_lock` serialize tất cả inference → request thứ 2 phải đợi request thứ 1 xong.
- Đây là thiết kế có chủ đích để tránh KV cache corruption.
- Cho production multi-user: dùng [Nano-vLLM](https://github.com/a710128/nanovllm-voxcpm) hỗ trợ concurrent requests native.

---

## Tóm tắt commands chạy nhanh

```bash
# 1. Clone
git clone -b feature_fixbug --single-branch https://github.com/Thanh25082005/VoxCPM.git
cd VoxCPM

# 2. Backend setup
python3 -m venv venv && source venv/bin/activate
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124
pip install -e .
pip install PyJWT python-multipart

# 3. Frontend setup
cd web && npm install && npx prisma generate && npx prisma migrate dev --name init && cd ..

# 4. Env config
cp web/.env.example web/.env.local
# Sửa web/.env.local nếu cần
export TTS_INTERNAL_SECRET="dev-internal-secret-change-me"

# 5. Run backend (terminal 1)
python app.py --port 8808

# 6. Run frontend (terminal 2)
cd web && npm run dev
```

Mở `http://localhost:3000` để sử dụng.
