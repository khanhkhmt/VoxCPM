# Hướng dẫn chạy VoxCPM (FastAPI + Next.js)

Tài liệu này mô tả cách chạy project theo kiến trúc hiện tại:
- Backend TTS: FastAPI (cổng `8808`)
- Frontend Web: Next.js (cổng `3000`)

---

## 1) Yêu cầu môi trường

- Python `>=3.10, <3.13`
- Node.js `>=18`
- npm
- Khuyến nghị GPU + CUDA để inference nhanh hơn

---

## 2) Chạy Backend FastAPI (TTS)

Tại thư mục gốc project:

```bash
cd /root/VoxCPM
pip install -e .
python app.py --port 8808
```

Kiểm tra backend sống:

```bash
curl http://127.0.0.1:8808/api/tts/health
```

Kỳ vọng trả về:

```json
{"status":"ok"}
```

Lưu ý:
- Lần chạy đầu có thể tải model, mất vài phút.
- Request generate đầu tiên thường chậm hơn do warm-up.

---

## 3) Chạy Frontend Next.js

Mở terminal khác:

```bash
cd /root/VoxCPM/web
npm install
npx prisma generate
npx prisma db push
npm run dev -- -p 3000
```

Mở trình duyệt:

```text
http://localhost:3000
```

---

## 4) Luồng chạy đúng

1. Chạy backend trước (`8808`)
2. Chạy frontend sau (`3000`)
3. Generate ở Studio

Frontend hiện gọi trực tiếp FastAPI qua `http://127.0.0.1:8808/api/tts`.

---

## 5) Các lỗi thường gặp và cách xử lý

### Lỗi A: `Generation Failed` / `TTS API Error 500`

Nguyên nhân phổ biến:
- Backend chưa chạy hoặc vừa crash
- Model chưa load xong nhưng đã bấm Generate
- Thiếu dependency (`fastapi`, `uvicorn`, `python-multipart`, ...)

Cách xử lý:
1. Kiểm tra health backend:
   ```bash
   curl http://127.0.0.1:8808/api/tts/health
   ```
2. Xem log backend (terminal chạy `app.py`)
3. Cài lại dependency:
   ```bash
   cd /root/VoxCPM
   pip install -e .
   ```
4. Khởi động lại backend rồi thử lại

---

### Lỗi B: `Cannot connect to the TTS backend (port 8808)`

Nguyên nhân:
- Cổng `8808` không có tiến trình lắng nghe
- Chạy sai host/port

Cách xử lý:
```bash
ss -ltnp | grep 8808
python app.py --port 8808
```

---

### Lỗi C: `Address already in use` (port 3000 hoặc 8808)

Nguyên nhân: cổng đã bị chiếm.

Cách xử lý:
```bash
ss -ltnp | grep 3000
ss -ltnp | grep 8808
kill <PID>
```

---

### Lỗi D: Login/Register báo lỗi DB (Prisma)

Nguyên nhân: chưa sync schema database.

Cách xử lý:
```bash
cd /root/VoxCPM/web
npx prisma generate
npx prisma db push
```

---

### Lỗi E: OOM GPU / hết VRAM

Nguyên nhân: model lớn, VRAM không đủ.

Cách xử lý:
- Đóng tiến trình AI khác
- Giảm `Inference Steps`
- Dùng CPU (chậm hơn) nếu cần

---

### Lỗi F: Generate rất chậm

Nguyên nhân:
- Lần đầu tải model/warm-up
- Chạy CPU
- `Inference Steps` cao

Khuyến nghị:
- Để `Inference Steps` ở mức thấp trước (mặc định UI đang là `6`)
- Chờ request đầu hoàn tất rồi test lại

---

## 6) Lệnh dừng nhanh

```bash
# dừng backend FastAPI
pkill -f "python app.py --port 8808"

# dừng frontend Next.js dev
pkill -f "next dev -H 0.0.0.0 -p 3000"
```

---

## 7) Checklist nhanh khi không chạy được

- [ ] `curl http://127.0.0.1:8808/api/tts/health` trả `{"status":"ok"}`
- [ ] `http://localhost:3000` mở được
- [ ] Đã chạy `prisma db push`
- [ ] Không bị trùng cổng 3000/8808
- [ ] Backend log không có traceback mới
