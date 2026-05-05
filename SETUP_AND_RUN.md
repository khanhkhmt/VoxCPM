# Hướng dẫn Cài đặt & Chạy Dự án VoxCPM Studio (Cập nhật mới nhất)

Tài liệu này hướng dẫn chi tiết cách thiết lập môi trường, cài đặt và chạy toàn bộ dự án bao gồm Backend AI (Python) và Frontend Web (Next.js).

---

## 1. Yêu cầu hệ thống
- **Hệ điều hành**: Linux (Ubuntu được khuyến nghị)
- **Python**: 3.10+
- **Node.js**: 20.x trở lên (Bắt buộc để chạy Next.js 15+)

---

## 2. Thiết lập Backend AI (Python)

Di chuyển vào thư mục gốc của dự án và thực hiện các bước sau:

### Cài đặt thư viện:
```bash
pip install . && export TTS_INTERNAL_SECRET="dev-internal-secret-change-me" python3 app. && py --port 8808
```

*Lưu ý: Backend mặc định phải chạy ở cổng `8808` để Frontend có thể kết nối.*

---

## 3. Thiết lập Frontend Web (Next.js)

Di chuyển vào thư mục `web/`:
```bash
cd web
```

### Bước 1: Tạo file cấu hình `.env.local`
Tạo file `.env.local` trong thư mục `web/` và dán nội dung sau đó chạy frontend: 

```bash
cd web && \
cat > .env.local <<'EOF'
DATABASE_URL="file:./prisma/dev.db"
AUTH_JWT_SECRET="dev-secret-CHANGE-ME-in-production-please"
NEXT_PUBLIC_TTS_API_BASE="http://127.0.0.1:8808/api/tts"
TTS_INTERNAL_SECRET="dev-internal-secret-change-me"
R2_ACCOUNT_ID="c6c72de2b009a468b58754f84c9cd020"
R2_ACCESS_KEY_ID="c1785f7092e927d595d8e66e2a939a77"
R2_SECRET_ACCESS_KEY="6c59feadad5162ec3540c8c04707b0219433e368c781c2ebc781cc3ab43fefcd"
R2_BUCKET_NAME="voxcpm-audio"
R2_PUBLIC_URL="https://pub-f6e9530ed8ce419993e861523e143b35.r2.dev"
EOF

npm install && \
npx prisma generate && \
npx prisma db push && \
npm run dev -- -p 3000

```

Nếu chưa cài Node.js thì chạy lệnh sau:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 4. Xử lý lỗi thường gặp (Troubleshooting)

### Lỗi 1: Phiên bản Node.js quá cũ (v12 hoặc v14)
**Dấu hiệu**: Khi chạy `npm install` gặp lỗi `SyntaxError: Unexpected token '?'` hoặc thông báo yêu cầu Node.js >= 18.
**Cách khắc phục**: Cài đặt Node.js 20 từ NodeSource:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

### Lỗi 2: Xung đột gói `libnode-dev` khi nâng cấp Node.js
**Dấu hiệu**: Lỗi `trying to overwrite '/usr/include/node/common.gypi', which is also in package libnode-dev`.
**Cách khắc phục**: Gỡ bỏ gói xung đột trước khi cài đặt lại:
```bash
apt-get remove -y libnode-dev
apt-get install -y nodejs
```

### Lỗi 3: Backend không phản hồi
**Dấu hiệu**: Frontend báo lỗi khi nhấn "Generate" hoặc không tải được mẫu giọng.
**Cách khắc phục**: 
- Kiểm tra xem Backend đã chạy chưa bằng lệnh: `curl http://localhost:8808/health`. Nếu nhận được `{"status":"ok"}` là bình thường.
- Đảm bảo bạn đã cài đặt đúng phiên bản `voxcpm` bằng lệnh `pip install -e .`.

### Lỗi 4: Không tạo được Database
**Dấu hiệu**: Lỗi liên quan đến Prisma hoặc không tìm thấy file `dev.db`.
**Cách khắc phục**: Xóa file `prisma/dev.db` (nếu có) và chạy lại:
```bash
npx prisma db push
```

---

## 5. Quy trình chạy nhanh (Dành cho Dev)
Mở 2 terminal riêng biệt:
- **Terminal 1 (Backend)**: `python3 app.py --port 8808`
- **Terminal 2 (Frontend)**: `cd web && npm run dev -- -p 3000`
