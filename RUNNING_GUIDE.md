# Hướng dẫn chạy dự án VoxCPM (Môi trường Local)

Tài liệu này hướng dẫn chi tiết từng bước để thiết lập và chạy hệ thống **VoxCPM** (Frontend Next.js + Backend FastAPI) hoàn toàn trên môi trường Local (chạy trực tiếp không cần cấu hình Nginx). Bao gồm cả các cấu hình Key, Database và danh sách các lỗi thường gặp trong quá trình phát triển.

---

## 1. Yêu cầu hệ thống

- **Hệ điều hành**: Linux (Ubuntu 20.04/22.04 khuyến nghị) hoặc macOS.
- **Python**: Phiên bản `3.10` trở lên.
- **Node.js**: Phiên bản `18.x` trở lên (Khuyến nghị `v20.x`).
- **NVIDIA GPU**: Khuyến nghị có GPU với CUDA (>= 8GB VRAM) để chạy model TTS nhanh. Nếu không có, model sẽ chạy trên CPU (khá chậm).

---

## 2. Cài đặt Backend (FastAPI - Port 8808)

Backend chịu trách nhiệm xử lý các luồng inference mô hình AI (Text-to-Speech) và WebSocket streaming.

### Bước 2.1: Tạo môi trường ảo (Virtual Environment)
Mở terminal tại thư mục gốc của dự án `VoxCPM`:
```bash
cd /home/step/VoxCPM
python3 -m venv venv
source venv/bin/activate
```

### Bước 2.2: Cài đặt thư viện Python
Chắc chắn bạn đã kích hoạt môi trường ảo (có chữ `(venv)` ở đầu dòng lệnh).
```bash
pip install -r requirements.txt
```
*(Nếu cài đặt trên Linux gặp lỗi thiếu thư viện build, hãy chạy `sudo apt-get update && sudo apt-get install build-essential python3-dev` trước).*

### Bước 2.3: Tải Model Weights
Dự án yêu cầu model VoxCPM. Đảm bảo bạn đã tải model weights và đặt vào thư mục chỉ định trong code (ví dụ thư mục `model_weights/` nếu backend yêu cầu).

### Bước 2.4: Khởi chạy Backend
```bash
python app.py --port 8808
```
Backend sẽ khởi chạy và lắng nghe ở địa chỉ: `http://127.0.0.1:8808`

---

## 3. Cài đặt Frontend (Next.js - Port 3000)

Frontend cung cấp giao diện Studio, xử lý Auth, Database (SQLite) và giao tiếp Cloudflare R2.

### Bước 3.1: Di chuyển vào thư mục web và cài đặt thư viện
```bash
cd /home/step/VoxCPM/web
npm install
```

### Bước 3.2: Cấu hình biến môi trường (`.env.local`)
Tạo hoặc chỉnh sửa file `web/.env.local`. **LƯU Ý:** Do chạy ở local (không qua Nginx), `NEXT_PUBLIC_TTS_API_BASE` phải trỏ thẳng vào `127.0.0.1:8808`. Dưới đây là nội dung toàn bộ file bao gồm SQL key và R2 key của bạn:

```env
# Database SQLite Local
DATABASE_URL="file:./prisma/dev.db"

# Secret cho JWT Authentication (Có thể tuỳ chỉnh)
AUTH_JWT_SECRET="dev-secret-CHANGE-ME-in-production-please"

# API Base trỏ thẳng tới Backend Local (Bắt buộc cho Local dev)
NEXT_PUBLIC_TTS_API_BASE="http://127.0.0.1:8808/api/tts"
TTS_INTERNAL_SECRET="dev-internal-secret-change-me"

# Cloudflare R2 Credentials (Lưu trữ Audio file)
R2_ACCOUNT_ID="c6c72de2b009a468b58754f84c9cd020"
R2_ACCESS_KEY_ID="c1785f7092e927d595d8e66e2a939a77"
R2_SECRET_ACCESS_KEY="6c59feadad5162ec3540c8c04707b0219433e368c781c2ebc781cc3ab43fefcd"
R2_BUCKET_NAME="voxcpm-audio"
R2_PUBLIC_URL="https://pub-f6e9530ed8ce419993e861523e143b35.r2.dev"
```

### Bước 3.3: Khởi tạo Database (Prisma SQLite)
Bạn phải cập nhật database schema trước khi chạy. Mở terminal tại thư mục `web/`:
```bash
npx prisma generate
npx prisma db push
```
Lệnh này sẽ tạo ra file `dev.db` tại thư mục `web/prisma/dev.db`.

### Bước 3.4: Khởi chạy Frontend
```bash
npm run dev -- -p 3000
```
Frontend sẽ lắng nghe tại địa chỉ: `http://localhost:3000`

---

## 4. Kiểm tra hoạt động

1. Mở trình duyệt và truy cập `http://localhost:3000`.
2. Đăng ký/Đăng nhập một tài khoản.
3. Vào **Studio**, nhập văn bản và bấm **Generate Speech** (chế độ Batch Mode hoặc Streaming Mode).
4. Quan sát log ở terminal Backend (cổng 8808) xem quá trình Inference có chạy không.

---

## 5. CÁC LỖI THƯỜNG GẶP VÀ CÁCH KHẮC PHỤC (TROUBLESHOOTING)

Trong quá trình phát triển dự án này, hệ thống rất hay gặp phải các lỗi liên quan đến giao tiếp Frontend - Backend. Dưới đây là các lỗi kinh điển và cách xử lý:

### 5.1. Lỗi Streaming Realtime (WebSocket) không hoạt động
**Biểu hiện:** Bấm Generate ở chế độ Streaming, không có âm thanh nào trả về, F12 (Console) báo lỗi `WebSocket connection failed`.
**Nguyên nhân:** Biến môi trường `NEXT_PUBLIC_TTS_API_BASE` bị sai. Next.js dùng biến này để build URL WebSocket (VD: `ws://...`).
**Cách fix:** Mở file `web/.env.local`, đảm bảo:
```env
NEXT_PUBLIC_TTS_API_BASE="http://127.0.0.1:8808/api/tts"
```
Đóng Frontend và chạy lại `npm run dev`.

### 5.2. Lỗi CORS khi trình duyệt phát Audio (File dài quá 7 giây)
**Biểu hiện:** Trong Console báo lỗi `Blocked by CORS policy` khi trình duyệt cố `fetch()` file âm thanh từ đường dẫn `https://pub-f6e...r2.dev/`. Audio không phát được.
**Nguyên nhân:** Cloudflare R2 bucket mặc định chặn các request Fetch từ Javascript trên một Domain khác (Cross-Origin).
**Cách fix đã áp dụng trong code:** 
Thay vì fetch trực tiếp link R2, chúng ta đã sửa Frontend để gọi qua một Proxy endpoint do Next.js cung cấp: `/api/voices/[id]/audio`. Endpoint này sẽ tải file từ R2 ở phía server (nơi không bị giới hạn CORS) và stream dữ liệu về cho trình duyệt.
*Lưu ý:* Khi upload audio, hệ thống hiện tại đã tích hợp cơ chế Web Audio API để **tự động cắt audio dài xuống tối đa 7 giây** nhằm tối ưu thời gian tạo Model Feature.

### 5.3. Lỗi 500 khi lưu lịch sử (History) / Lỗi chứng chỉ SSL (Self-Signed)
**Biểu hiện:** API `/api/history` báo lỗi 500 kèm log `DEPTH_ZERO_SELF_SIGNED_CERT`.
**Nguyên nhân:** Thường xảy ra khi bạn dùng Nginx bọc HTTPS bên ngoài bằng chứng chỉ tự cấp (Self-signed cert). Khi Next.js gọi API `https://.../api/tts/file/xxx.wav` về lại chính server của mình, Node.js sẽ từ chối kết nối vì chứng chỉ không đáng tin cậy.
**Cách fix:** Hàm `resolveBackendAudioUrl` trong `web/src/app/api/history/route.ts` đã được sửa để bóc tách URL HTTPS và chuyển thành gọi nội bộ `http://127.0.0.1:8808/api/tts/...`. Do đó khi chạy Local hoàn toàn (không HTTPS), bạn sẽ không gặp lỗi này.

### 5.4. Lỗi 404 khi tải Audio file hoặc khi Encode Feature
**Biểu hiện:** Báo lỗi `encode-voice failed: 404 Not Found` trên terminal Next.js.
**Nguyên nhân:** Có thể do cấu hình `next.config.ts` thiết lập `rewrites` bị sai đường dẫn, hoặc service FastAPI đang chưa chạy.
**Cách kiểm tra:**
- Đảm bảo Backend đang chạy đúng cổng 8808. 
- Mở Terminal chạy thử: `curl -I http://127.0.0.1:8808/api/tts/health`. Nếu không có phản hồi, Backend đã chết.

### 5.5. Lỗi Prisma / Database bị khóa (Database is locked)
**Biểu hiện:** Lỗi `PrismaClientKnownRequestError: database is locked`.
**Nguyên nhân:** SQLite chỉ hỗ trợ 1 luồng ghi tại một thời điểm. Nếu có nhiều request đồng thời, DB sẽ bị lock.
**Cách fix:** Hạn chế spam API liên tục. Trong môi trường dev, nếu bị lỗi nặng, bạn có thể xoá file `web/prisma/dev.db` và chạy lại lệnh `npx prisma db push` để tạo lại DB mới tinh.
