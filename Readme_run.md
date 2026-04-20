# Hướng dẫn chạy dự án VoxCPM (Local)

Tài liệu này hướng dẫn cách thiết lập và chạy toàn bộ hệ thống dự án VoxCPM (bao gồm Frontend Next.js và Backend FastAPI/Gradio) tại môi trường local.

---

## 1. Yêu cầu hệ thống (Prerequisites)

- **Node.js**: >= 18.x (dành cho frontend Next.js)
- **Python**: >= 3.10, < 3.13 (dành cho backend AI)
- **PyTorch**: >= 2.0 (với cấu hình CUDA phù hợp nếu chạy trên GPU)
- **Cơ sở dữ liệu**: SQLite (mặc định được tích hợp qua libSQL/Prisma)

---

## 2. Khởi chạy Backend (AI Inference Server)

Backend chịu trách nhiệm chạy các Model TTS (Text-To-Speech) và cung cấp API tạo giọng nói. Mặc định có 2 server backend:

**A. FastAPI Server (Production-grade, Streaming, Low-latency)**
Nằm tại thư mục gốc `/root/VoxCPM`. Mở terminal và chạy:
```bash
# Cài đặt (nếu chưa cài)
pip install -r requirements.txt
pip install fastapi uvicorn websockets python-multipart

# Khởi chạy server trên port 8000
python -m voxcpm.inference.server --model-id openbmb/VoxCPM2 --port 8000
```
*Lưu ý: Quá trình load model và `torch.compile` warm-up ban đầu có thể tốn 1-3 phút.*

**B. Gradio Demo (Tùy chọn)**
Nếu bạn muốn dùng giao diện Gradio cũ, chạy lệnh:
```bash
python app.py
```
*(Mặc định chạy trên port 8808)*

---

## 3. Khởi chạy Frontend (Next.js Web UI)

Frontend nằm trong thư mục `web/`. Mở một terminal mới:

### Bước 3.1: Cài đặt dependencies
```bash
cd web
npm install
```

### Bước 3.2: Thiết lập Database (Rất quan trọng ⚠️)
Dự án sử dụng Prisma với SQLite. Trước khi chạy server, bạn **BẮT BUỘC** phải đồng bộ schema xuống database để tạo các bảng (tables) như `User`, `Session`, v.v.
```bash
npx prisma generate
npx prisma db push
```

### Bước 3.3: Khởi chạy Development Server
```bash
npm run dev -- -p 3000 -H 0.0.0.0
```
Trang web sẽ hiện trên: `http://localhost:3000`

---

## 4. Các lỗi thường gặp (Troubleshooting & Bugs)

Dựa trên lịch sử phát triển, dưới đây là các lỗi bạn có thể gặp phải và cách khắc phục:

### ❌ Lỗi 1: `Internal server error` khi Đăng nhập / Đăng ký
- **Nguyên nhân**: Quên khởi tạo Database. File SQLite (`web/prisma/dev.db`) chưa có các bảng (ví dụ: `no such table: main.User`).
- **Cách fix**: Tắt server Next.js, chạy lệnh sau trong thư mục `web/`:
  ```bash
  npx prisma db push
  ```

### ❌ Lỗi 2: Nhập đúng Captcha nhưng hệ thống báo sai
- **Nguyên nhân**: Chế độ `React Strict Mode` trong quá trình Development (`npm run dev`) tự động gọi API sinh captcha 2 lần. Điều này làm mã Captcha trên màn hình (lần 1) bị lệch với mã lưu trong hệ thống (lần 2).
- **Cách fix**: Lỗi này đã được vá trong file `src/lib/auth/captcha.ts` (Sử dụng cơ chế `idempotent` theo UUID và `globalThis.__captchaStore_v2__`). Nếu bạn vẫn gặp lại, hãy đảm bảo bạn không vô tình ghi đè lại file này, hoặc khởi động lại (restart) dev server.

### ❌ Lỗi 3: `Another next dev server is already running`
- **Nguyên nhân**: Port 3000 đã bị chiếm dụng bởi một tiến trình Next.js khác đang chạy ngầm hoặc bị treo.
- **Cách fix**:
  ```bash
  # Tìm và tắt tiến trình chạy cổng 3000
  kill -9 $(lsof -t -i:3000)
  ```

### ❌ Lỗi 4: Out of Memory (OOM) khi chạy Backend
- **Nguyên nhân**: Server AI tốn khá nhiều VRAM (GPU). Nếu chạy song song cả Gradio (`app.py`) và FastAPI (`server`), GPU có thể bị tràn RAM.
- **Cách fix**: Chỉ chạy 1 backend tại 1 thời điểm. Dùng `nvidia-smi` để kiểm tra dung lượng VRAM. Dùng `pkill -f` để tắt các tiến trình python bị kẹt.

### ❌ Lỗi 5: Cảnh báo `Tesla T4 does not support bfloat16 compilation natively`
- **Nguyên nhân**: Card GPU T4 đời cũ không tối ưu tốt cho `bfloat16`.
- **Cách fix**: Đây chỉ là cảnh báo của `torch.compile`, model vẫn chạy bình thường. Bạn có thể bỏ qua.
