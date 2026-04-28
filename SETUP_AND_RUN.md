# Hướng dẫn Cài đặt & Chạy Dự án VoxCPM Studio (MVP Streaming)

Tài liệu này hướng dẫn chi tiết cách thiết lập môi trường, cài đặt và chạy toàn bộ dự án bao gồm Backend AI (Python) và Frontend Web (Next.js), đặc biệt cho tính năng Real-time Streaming TTS.

---

## 1. Yêu cầu hệ thống
- **Hệ điều hành**: Linux (Ubuntu được khuyến nghị)
- **Python**: 3.10+
- **Node.js**: 20.x trở lên (Bắt buộc để chạy Next.js 15+)
- **Git**

---

## 2. Clone Repo & Cài đặt Backend AI (Python)

```bash
# Clone repo và checkout nhánh Streaming MVP
git clone https://github.com/Thanh25082005/VoxCPM.git
cd VoxCPM
git checkout feature/realtime-tts-streaming-mvp

# Cài đặt thư viện Python
pip install -e .

# Khởi động Backend (mặc định chạy ở cổng 8808)
python3 app.py --port 8808
```

*Lưu ý: Backend phải chạy ở cổng `8808` để Frontend có thể kết nối WebSocket.*

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

File `.env.local` của bạn sẽ trông giống như sau (nếu R2 được sử dụng, hãy điền thông tin thật vào):
```env
DATABASE_URL="file:./prisma/dev.db"
AUTH_JWT_SECRET="dev-secret-CHANGE-ME-in-production-please"
NEXT_PUBLIC_TTS_API_BASE="http://127.0.0.1:8808/api/tts"

R2_ACCOUNT_ID="c6c72de2b009a468b58754f84c9cd020"
R2_ACCESS_KEY_ID="c1785f7092e927d595d8e66e2a939a77"
R2_SECRET_ACCESS_KEY="6c59feadad5162ec3540c8c04707b0219433e368c781c2ebc781cc3ab43fefcd"
R2_BUCKET_NAME="voxcpm-audio"
R2_PUBLIC_URL="https://pub-f6e9530ed8ce419993e861523e143b35.r2.dev"
```
*(Lưu ý: R2 là **optional** cho việc test giao diện local cơ bản. Bạn có thể để trống nếu chỉ muốn xem UI sinh ra audio. Tuy nhiên để lưu History thì bắt buộc phải có R2).*

### Bước 2: Cài đặt thư viện & Khởi chạy

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev -- -p 3000
```

*Lỗi thường gặp (Known Blockers):*
- Nếu lệnh `npm run build` hoặc `npm run lint` báo lỗi (ví dụ: `earlyAccess` hoặc `UserWhereUniqueInput`), đây là lỗi type có từ trước của Prisma và `seed-admin.ts`, không cản trở việc chạy `npm run dev`.

---

## 4. Hướng dẫn Test Tính năng

Sau khi Backend và Frontend đã chạy:
1. Truy cập `http://localhost:3000`
2. Vào màn hình **Studio**

### Test Batch Mode (Cũ)
- Gạt sang chế độ **Batch Mode**
- Nhập text ngắn ("he heh hehe")
- Bấm **Generate Speech**. Nút sẽ quay mòng mòng (Loading), và khi xong toàn bộ âm thanh sẽ hiện ra.

### Test Streaming Mode (Mới)
- Gạt sang chế độ **Streaming Mode ⚡**
- Một bảng điều khiển StreamingTTSPanel sẽ hiện ra.
- Nhập text dài (30-50 chữ).
- Bấm **Start Streaming**. Âm thanh sẽ được trả về dạng real-time qua WebSocket và phát ra loa ngay lập tức mà không cần chờ.
- Chức năng này kết nối trực tiếp đến endpoint WebSocket `/ws/tts/stream` của Backend.
- Khi hoàn tất, link sẽ tự động được upload lên R2 (nếu có cấu hình) để lưu vào lịch sử.
