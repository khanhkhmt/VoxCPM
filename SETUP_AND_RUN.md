# Hướng dẫn Cài đặt & Chạy Dự án VoxCPM Studio

Tài liệu này hướng dẫn chi tiết cách thiết lập môi trường, cài đặt và chạy toàn bộ dự án bao gồm Backend AI (Python) và Frontend Web (Next.js).

---

## 1. Yêu cầu hệ thống
- **Hệ điều hành**: Linux (Ubuntu được khuyến nghị)
- **Python**: 3.10+
- **Node.js**: 20.x trở lên (Bắt buộc để chạy Next.js 15+)
- **Git**

---

## 2. Clone Repo & Cài đặt Backend AI (Python)

```bash
# Clone repo
git clone https://github.com/Thanh25082005/VoxCPM.git
cd VoxCPM

# Cài đặt thư viện Python
pip install -e .
```

### Cấu hình Internal Secret cho Backend

Backend FastAPI yêu cầu biến môi trường `TTS_INTERNAL_SECRET` để xác thực các request nội bộ từ Next.js.

```bash
# Set biến môi trường (phải KHỚP với giá trị trong web/.env.local)
export TTS_INTERNAL_SECRET="dev-internal-secret-change-me"
```

> ⚠️ **Quan trọng:** Giá trị `TTS_INTERNAL_SECRET` phải giống hệt nhau ở cả FastAPI (biến môi trường) và Next.js (`web/.env.local`). Nếu không khớp, các request từ Next.js tới FastAPI sẽ bị từ chối (401 Unauthorized).

### Khởi động Backend

```bash
# Khởi động Backend (mặc định chạy ở cổng 8808)
python3 app.py --port 8808
```

*Lưu ý: Backend phải chạy ở cổng `8808` để Frontend có thể kết nối WebSocket và gửi API request.*

---

## 3. Thiết lập Frontend Web (Next.js)

Mở một Terminal khác và di chuyển vào thư mục `web/`:
```bash
cd web
```

### Bước 1: Tạo file cấu hình `.env.local`
Sao chép từ file mẫu:
```bash
cp .env.example .env.local
```

Mở file `.env.local` và điền các giá trị phù hợp:
```env
DATABASE_URL="file:./prisma/dev.db"
AUTH_JWT_SECRET="dev-secret-CHANGE-ME-in-production-please"
NEXT_PUBLIC_TTS_API_BASE="http://127.0.0.1:8808/api/tts"

# BẮT BUỘC: phải khớp với giá trị TTS_INTERNAL_SECRET của Backend
TTS_INTERNAL_SECRET="dev-internal-secret-change-me"

# Cloudflare R2 — cần để lưu History và Voice Library
R2_ACCOUNT_ID="c6c72de2b009a468b58754f84c9cd020"
R2_ACCESS_KEY_ID="c1785f7092e927d595d8e66e2a939a77"
R2_SECRET_ACCESS_KEY="6c59feadad5162ec3540c8c04707b0219433e368c781c2ebc781cc3ab43fefcd"
R2_BUCKET_NAME="voxcpm-audio"
R2_PUBLIC_URL="https://pub-f6e9530ed8ce419993e861523e143b35.r2.dev"
```
*(Lưu ý: R2 là **optional** cho việc test giao diện local cơ bản. Bạn có thể để trống nếu chỉ muốn xem UI sinh ra audio. Tuy nhiên để lưu History thì bắt buộc phải có R2).*

### Bước 2: Cài đặt thư viện & Khởi tạo Database

```bash
npm install
npx prisma generate
npx prisma db push
```

> ⚠️ **Dùng `db push` thay vì `migrate dev`:** Schema hiện tại đã bao gồm model `ApiKey` (Phase 2). Lệnh `npx prisma db push` sẽ đồng bộ toàn bộ schema xuống SQLite mà không cần migration file mới.

### Bước 3: Khởi chạy Frontend

```bash
npm run dev -- -p 3000
```
Sau đó truy cập vào trình duyệt tại: `http://localhost:3000`

*Lỗi thường gặp (Known Blockers):*
- Nếu lệnh `npm run build` hoặc `npm run lint` báo lỗi (ví dụ: `earlyAccess` hoặc `UserWhereUniqueInput`), đây là lỗi type có từ trước của Prisma và `seed-admin.ts`, không cản trở việc chạy `npm run dev`.

---

## 4. Tổng quan Tính năng

### Studio
- **Batch Mode**: Nhập text → Bấm Generate Speech → Nhận audio hoàn chỉnh.
- **Streaming Mode ⚡**: Nhập text → Bấm Start Streaming → Audio được trả về real-time qua WebSocket.

### History & Voice Library
- Mọi kết quả TTS được tự động lưu vào History (nếu R2 đã cấu hình).
- Voice Library cho phép tạo và quản lý giọng mẫu.

### Settings & API Keys (Phase 2)
- Trang `/studio/settings` cho phép tạo API Key để truy cập TTS qua External API (`/api/v1/tts/generate`).
- Hệ thống quota tracking cơ bản theo ký tự (characters).
- API Key chỉ hiển thị 1 lần khi tạo, sau đó chỉ hiện prefix + last 4 ký tự.

---

## 5. Hướng dẫn Test Tính năng

Sau khi Backend và Frontend đã chạy:
1. Truy cập `http://localhost:3000`
2. Đăng ký tài khoản mới
3. Vào màn hình **Studio**

### Test Batch Mode
- Đảm bảo đang ở chế độ **Batch Mode**
- Nhập text ngắn ("Xin chào thế giới")
- Bấm **Generate Speech**. Nút sẽ quay loading, và khi xong toàn bộ âm thanh sẽ hiện ra.
- Kiểm tra **History** (sidebar) — record mới phải xuất hiện.

### Test Streaming Mode
- Gạt sang chế độ **Streaming Mode ⚡**
- Một bảng điều khiển StreamingTTSPanel sẽ hiện ra.
- Nhập text dài (30-50 chữ).
- Bấm **Start Streaming**. Âm thanh sẽ được trả về dạng real-time qua WebSocket.
- Khi hoàn tất, record sẽ tự động được lưu vào History.

### Test API Keys (Phase 2)
- Vào **Settings** (sidebar)
- Tạo API Key mới → Copy plain key
- Reload trang → Plain key phải biến mất (chỉ hiện masked)
- Test External API:
  ```bash
  curl -X POST http://localhost:3000/api/v1/tts/generate \
    -H "Authorization: Bearer <your-api-key>" \
    -H "Content-Type: application/json" \
    -d '{"text": "Hello world"}'
  ```
