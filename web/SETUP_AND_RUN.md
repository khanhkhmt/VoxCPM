# Hướng dẫn Cài đặt & Chạy Dự án VoxCPM Studio (Web Frontend)

Tài liệu này hướng dẫn cách cài đặt và chạy phần web UI (Next.js) của dự án VoxCPM, kết nối với backend FastAPI.

## 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 20.x hoặc 22.x
- **Python**: Phiên bản 3.10+ (dành cho backend AI ở thư mục gốc)

## 2. Clone dự án

Mở terminal và chạy lệnh:

```bash
git clone https://github.com/Thanh25082005/VoxCPM.git
cd VoxCPM
```

## 3. Tạo file cấu hình (.env.local)

Dự án sử dụng Cloudflare R2 để lưu trữ file Audio (Lịch sử và Thư viện giọng mẫu).

Tạo file `web/.env.local` bằng cách copy từ template:

```bash
cd web
cp .env.example .env.local
```

Mở `web/.env.local` và điền các giá trị. Ví dụ:

*(Lưu ý: Các key R2 dưới đây đã được chủ dự án cho phép public để phục vụ việc test)*

```env
# === Database ===
DATABASE_URL="file:./prisma/dev.db"

# === Authentication ===
AUTH_JWT_SECRET="dev-secret-CHANGE-ME-in-production-please"

# === TTS Backend ===
NEXT_PUBLIC_TTS_API_BASE="http://127.0.0.1:8808/api/tts"

# === Internal Secret (BẮT BUỘC) ===
# Phải KHỚP với giá trị TTS_INTERNAL_SECRET của Backend Python.
# Nếu không khớp: Batch/Streaming/History sẽ fail do backend reject request (401).
TTS_INTERNAL_SECRET="dev-internal-secret-change-me"

# === Cloudflare R2 Storage ===
R2_ACCOUNT_ID="c6c72de2b009a468b58754f84c9cd020"
R2_ACCESS_KEY_ID="c1785f7092e927d595d8e66e2a939a77"
R2_SECRET_ACCESS_KEY="6c59feadad5162ec3540c8c04707b0219433e368c781c2ebc781cc3ab43fefcd"
R2_BUCKET_NAME="voxcpm-audio"
R2_PUBLIC_URL="https://pub-f6e9530ed8ce419993e861523e143b35.r2.dev"
```

## 4. Cài đặt Dependencies & Khởi tạo Database

```bash
npm install
npx prisma generate
npx prisma db push
```

> ⚠️ **Dùng `db push` thay vì `migrate dev`:** Schema hiện tại đã bao gồm model `ApiKey` (Phase 2). Lệnh `npx prisma db push` sẽ đồng bộ toàn bộ schema xuống SQLite.

## 5. Chạy ứng dụng Frontend (Next.js)

```bash
npm run dev -- -p 3000
```
Sau đó truy cập vào trình duyệt tại: `http://localhost:3000`

---

## ⚠️ Lưu ý quan trọng: Chạy Backend AI

Để ứng dụng có thể tạo được giọng nói, bạn **bắt buộc** phải chạy Backend AI (FastAPI) trước đó.

```bash
# Quay lại thư mục gốc VoxCPM
cd ..

# Set internal secret (phải KHỚP với giá trị trong web/.env.local)
export TTS_INTERNAL_SECRET="dev-internal-secret-change-me"

# Cài đặt môi trường nếu chưa có
pip install -e .

# Khởi động Backend
python3 app.py --port 8808
```

Backend mặc định phải chạy ở cổng `8808` để Frontend có thể gửi API request và kết nối WebSocket.

---

## Tính năng đã có

| Tính năng | Mô tả |
|---|---|
| **Batch Mode** | Tạo audio hoàn chỉnh từ text |
| **Streaming Mode ⚡** | Real-time TTS qua WebSocket |
| **History** | Lưu trữ lịch sử tạo audio (cần R2) |
| **Voice Library** | Quản lý giọng mẫu |
| **Settings / API Keys** | Tạo API Key cho External API, quota tracking |
