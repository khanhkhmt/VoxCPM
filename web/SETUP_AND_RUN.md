# Hướng dẫn Cài đặt & Chạy Dự án VoxCPM Studio (Bao gồm Key)

Tài liệu này hướng dẫn cách clone, cấu hình và chạy dự án web UI (Next.js) kết nối với backend FastAPI (tạo giọng nói).

## 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 20.x hoặc 22.x
- **Python**: Phiên bản 3.10+ (dành cho backend AI ở thư mục gốc)

## 2. Clone dự án

Mở terminal và chạy lệnh:

```bash
git clone https://github.com/khanhkhmt/test_ver2.git
cd test_ver2
```

## 3. Tạo file cấu hình (.env.local)

Do dự án sử dụng Cloudflare R2 để lưu trữ các file Audio (Lịch sử và Thư viện giọng mẫu), bạn cần tạo file `.env.local` ở thư mục gốc của project web (`test_ver2`) với nội dung sau:

*(Lưu ý: Các key này đã được chủ dự án cho phép public để phục vụ việc test)*

Tạo file `.env.local` và dán nguyên văn đoạn dưới đây vào:

```env
# === Database ===
# Cấu hình đường dẫn tới file SQLite local
DATABASE_URL="file:./prisma/dev.db"

# === Authentication ===
# Secret key dùng để mã hóa session
AUTH_JWT_SECRET="dev-secret-CHANGE-ME-in-production-please"

# === Cloudflare R2 Storage (Lưu trữ file Audio) ===
R2_ACCOUNT_ID="c6c72de2b009a468b58754f84c9cd020"
R2_ACCESS_KEY_ID="c1785f7092e927d595d8e66e2a939a77"
R2_SECRET_ACCESS_KEY="6c59feadad5162ec3540c8c04707b0219433e368c781c2ebc781cc3ab43fefcd"
R2_BUCKET_NAME="voxcpm-audio"
R2_PUBLIC_URL="https://pub-f6e9530ed8ce419993e861523e143b35.r2.dev"
```

## 4. Cài đặt các thư viện (Dependencies)

Sau khi đã có file cấu hình, tiến hành cài đặt các gói NPM:

```bash
npm install
```

## 5. Khởi tạo Database (SQLite)

Dự án sử dụng Prisma và SQLite. Để khởi tạo cấu trúc dữ liệu ban đầu, chạy lần lượt các lệnh:

```bash
# Tạo Prisma Client
npx prisma generate

# Đồng bộ schema xuống file database (dev.db)
npx prisma db push
```

## 6. Chạy ứng dụng Frontend (Next.js)

Bật server ở chế độ development:

```bash
npm run dev -- -p 3000
```
Sau đó truy cập vào trình duyệt tại: `http://localhost:3000`

---

## ⚠️ Lưu ý quan trọng: Chạy Backend AI

Để ứng dụng có thể tạo được giọng nói, bạn **bắt buộc** phải chạy Backend AI (FastAPI) nằm ở thư mục gốc của repo AI (VoxCPM) trước đó.

Cách chạy backend AI (Nếu bạn có source AI):
```bash
# Trỏ vào thư mục chứa code AI gốc (VoxCPM)
# Cài đặt môi trường nếu chưa có (pip install -e .)

python app.py --port 8808
```

Backend mặc định phải chạy ở cổng `8808` để Frontend có thể gửi API request sang được.
