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
pip install . --break-system-packages
export TTS_INTERNAL_SECRET="dev-internal-secret-change-me"
python3 app.py --port 8808
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

# === Google OAuth (Sign in with Google) — tùy chọn ===
# Để trống nếu chưa cần. Khi để trống, button "Sign in with Google" sẽ
# redirect về /login?error=google_not_configured (không crash app).
# Hướng dẫn tạo credentials xem mục 3.bis bên dưới.
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
APP_URL="http://localhost:3000"
EOF

npm install && \
npx prisma generate && \
npx prisma migrate deploy && \
npm run dev -- -p 3000

```

Nếu chưa cài Node.js thì chạy lệnh sau:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
```

## 3.bis Bật "Sign in with Google" (tùy chọn)

Nếu muốn dùng tính năng đăng nhập bằng Google, làm các bước sau (nếu bỏ qua, app vẫn chạy bình thường với username/password).

### Bước 1: Tạo OAuth Client trên Google Cloud
1. Vào https://console.cloud.google.com/apis/credentials
2. Bấm **Create Credentials** → **OAuth client ID** → Application type: **Web application**.
3. **Authorized redirect URIs**: thêm chính xác `http://localhost:3000/api/auth/google/callback` cho dev. Với production thêm thêm URL tương ứng (vd `https://your-domain.com/api/auth/google/callback`).
4. Copy **Client ID** và **Client Secret** sinh ra.

### Bước 2: Điền vào `web/.env.local`
```env
GOOGLE_CLIENT_ID="<paste-client-id-here>"
GOOGLE_CLIENT_SECRET="<paste-client-secret-here>"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
APP_URL="http://localhost:3000"
```

**Lưu ý quan trọng về `APP_URL`**:
- `npm run dev` của Next.js bind ở `0.0.0.0:3000`. Nếu KHÔNG set `APP_URL`, các redirect OAuth có thể dùng host `0.0.0.0`, làm mất cookie state CSRF và báo lỗi `google_invalid_state`.
- Luôn đặt `APP_URL` = origin mà trình duyệt thực sự dùng (vd `http://localhost:3000`).

### Bước 3: Áp dụng migration Prisma cho bảng OAuthAccount
```bash
cd web
npx prisma migrate deploy   # áp dụng migration 20260513045005_add_google_oauth
npx prisma generate
```

### Bước 4: Test
1. Mở `http://localhost:3000/login`.
2. Bấm nút **"Sign in with Google"**.
3. Chọn tài khoản Google → consent → quay về `/studio` đã đăng nhập.

Lần đầu sẽ tự tạo `User` mới (passwordHash = NULL) và một dòng `OAuthAccount` link tới Google. Lần sau cùng tài khoản đó sẽ tái sử dụng user cũ, không tạo trùng.

### Các mã lỗi có thể gặp (trên URL `/login?error=...`)
- `google_not_configured` — chưa điền `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.
- `google_invalid_state` — cookie state mất (thường do origin mismatch; check `APP_URL`).
- `google_oauth_denied` — user bấm Cancel ở màn Google consent.
- `google_no_email` / `google_email_not_verified` — tài khoản Google chưa verify email.
- `google_token_exchange_failed` — `GOOGLE_CLIENT_SECRET` sai hoặc `redirect_uri` không khớp với cấu hình trên Google Cloud Console.

---

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

