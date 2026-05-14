# VoxCPM API Tester

Giao diện web độc lập để test các API endpoint của **VoxCPM Voice Clone TTS API**.

## Cấu trúc thư mục

```
Test/
├── .env                 # Biến môi trường (BASE_API_URL)
├── index.html           # HTML entry point
├── package.json         # Dependencies
├── README.md            # File này
├── vite.config.js       # Vite config
└── src/
    ├── main.jsx         # React entry
    ├── App.jsx          # Giao diện chính (4 tab test)
    ├── api.js           # Module gọi API (tách riêng)
    └── index.css        # Styling
```

## Cài đặt & Chạy

### 1. Cài dependencies

```bash
cd Test
npm install
```

### 2. Cấu hình `.env`

Mở file `.env` và chỉnh sửa `VITE_BASE_API_URL`:

```env
# Local development
VITE_BASE_API_URL=http://127.0.0.1:8000

# Production (đổi khi deploy)
# VITE_BASE_API_URL=https://api.yourdomain.com
```

> **Lưu ý:** Biến phải có prefix `VITE_` để Vite inject vào client code.

### 3. Chạy dev server

```bash
npm run dev
```

Mở trình duyệt tại `http://localhost:5173`.

### 4. Build production
Hãy refactor toàn bộ hệ thống API Documentation để không còn hardcode localhost hoặc domain cố định trong source code.

Yêu cầu:

1. Thay toàn bộ các URL dạng:

* http://127.0.0.1:3000
* http://localhost:3000
* localhost
* các base URL local khác

thành:

* https://103-214-9-83.nip.io

2. Không được hardcode domain trực tiếp trong component hoặc page nữa.

3. Tạo một cấu hình trung tâm để quản lý BASE_URL, ví dụ:

* env variable
* config.ts
* runtime config
* hoặc constants/api.ts

Ví dụ:

```ts
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://103-214-9-83.nip.io";
```

4. Toàn bộ API Documentation phải tự động lấy domain từ biến cấu hình này:

* curl examples
* fetch examples
* websocket examples
* API playground
* code snippets
* stream token examples
* tất cả endpoint hiển thị trên UI

5. Sau này khi đổi domain mới, chỉ cần sửa duy nhất:

```env
NEXT_PUBLIC_API_BASE_URL=https://new-domain.com
```

mà toàn bộ docs và examples tự cập nhật.

6. Kiểm tra toàn bộ project để đảm bảo:

* không còn localhost hardcode
* không còn 127.0.0.1 hardcode
* không còn domain cũ hardcode

7. Nếu project đang dùng:

* Next.js
* React
* Vite
* hoặc Node.js

hãy dùng đúng convention env tương ứng.

8. Sau khi refactor:

* tất cả API docs phải hiển thị đúng domain production
* code examples copy/paste chạy được ngay
* websocket URL cũng tự động sync theo BASE_URL

9. Bonus:
   Tạo helper function:

```ts
getApiBaseUrl()
```

để sau này dễ maintain hơn.

```bash
npm run build
```

Output nằm trong thư mục `dist/`, có thể serve bằng bất kỳ static file server nào.

## Các API được test

| Tab | Endpoint | Method |
|-----|----------|--------|
| Usage / Quota | `/api/v1/usage` | GET |
| TTS Generate | `/api/v1/tts/generate` | POST |
| Stream Token | `/api/v1/tts/stream-token` | POST |
| WebSocket | `/ws/tts/stream?token=<token>` | WebSocket |

## Cách đổi URL khi deploy

**Cách 1:** Sửa file `.env`:

```env
VITE_BASE_API_URL=https://api.yourdomain.com
```

**Cách 2:** Nhập trực tiếp trên giao diện (ô "Base API URL" ở sidebar).

Giá trị nhập trên giao diện sẽ ghi đè giá trị từ `.env`.

## Xác thực API

Tất cả request đều gửi header:

```
Authorization: Bearer <VOICE_API_KEY>
Content-Type: application/json
```

Nhập API Key dạng `vc_sk_live_xxx` vào ô "Voice API Key" trên sidebar.
