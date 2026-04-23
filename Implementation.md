# 📋 Implementation Plan v2: History + Voice Library (SQLite + R2)

> **Nguyên tắc bất di bất dịch:**
> - ❌ Không refactor toàn bộ project
> - ❌ Không đổi cấu trúc folder
> - ❌ Không xóa code cũ
> - ❌ Không đổi API cũ
> - ❌ Không sửa logic synthesis
> - ✅ Ưu tiên thêm file mới
> - ✅ Sửa file cũ → tối thiểu
> - ✅ Tách biệt rõ ràng, rollback dễ

---

## Kiến trúc tổng quan

```
SQLite (Prisma)          Cloudflare R2
  ├─ User          ─────→  (không đổi)
  ├─ Session       ─────→  (không đổi)
  ├─ TTSGeneration 🆕 ──→  audio files (generated)
  └─ VoiceProfile  🆕 ──→  audio files (uploaded)
```

**Nguyên tắc phân chia:**
- **SQLite**: Metadata nhẹ (text, settings, URLs, timestamps, quan hệ user)
- **R2**: File nhị phân nặng (audio .wav/.mp3)

---

## PHẦN A: DANH SÁCH TẤT CẢ FILES

### A1. Files MỚI (11 files) — an toàn 100%, rollback = xóa file

| # | File path | Loại | Mô tả |
|---|---|---|---|
| 1 | `src/lib/r2.ts` | Lib | R2 client (S3-compatible SDK) |
| 2 | `src/lib/api-utils.ts` | Lib | Helper: requireAuth, jsonOk, jsonError |
| 3 | `src/app/api/history/route.ts` | API | `GET` list + `POST` create + `DELETE` clear all |
| 4 | `src/app/api/history/[id]/route.ts` | API | `DELETE` xóa 1 history item |
| 5 | `src/app/api/voices/route.ts` | API | `GET` list + `POST` upload |
| 6 | `src/app/api/voices/[id]/route.ts` | API | `GET` detail + `PATCH` update + `DELETE` xóa |
| 7 | `src/app/api/voices/[id]/audio/route.ts` | API | `GET` stream audio file từ R2 |
| 8 | `src/app/studio/history/page.tsx` | Page | Trang lịch sử đầy đủ |
| 9 | `src/app/studio/voices/page.tsx` | Page | Trang thư viện giọng nói |
| 10 | `src/components/studio/HistoryList.tsx` | Component | Client component hiển thị history |
| 11 | `src/components/studio/VoiceLibrary.tsx` | Component | Client component quản lý voices |

### A2. Files SỬA (3 files) — thay đổi tối thiểu, chi tiết bên dưới

| # | File path | Thay đổi gì | Số dòng sửa |
|---|---|---|---|
| 1 | `prisma/schema.prisma` | Thêm 2 models mới + 2 dòng relation vào User | +2 dòng sửa, +35 dòng thêm |
| 2 | `src/components/studio/Sidebar.tsx` | Đổi 2 giá trị `href: "#"` thành paths thật | 2 dòng |
| 3 | `src/components/studio/Workspace.tsx` | Thêm 1 lệnh gọi API sau generate thành công | +8 dòng thêm, 0 dòng xóa |

### A3. Files cấu hình

| # | File | Thay đổi |
|---|---|---|
| 1 | `package.json` | Thêm 1 dependency: `@aws-sdk/client-s3` |
| 2 | `.env.local` (hoặc `.env`) | Thêm 5 biến R2 — file này đã trong `.gitignore` |

### A4. Files KHÔNG CHẠM — kiểm chứng rõ ràng

| Khu vực | Files | Trạng thái |
|---|---|---|
| **FastAPI backend** | `app.py`, `app_old.py` | ⛔ Không chạm |
| **AI Core** | `src/voxcpm/*` (tất cả) | ⛔ Không chạm |
| **Python scripts** | `scripts/`, `tests/`, `conf/` | ⛔ Không chạm |
| **TTS client** | `src/lib/tts.ts` | ⛔ Không chạm |
| **Auth system** | `src/lib/auth.tsx`, `src/lib/auth/*`, `src/app/api/auth/*` | ⛔ Không chạm |
| **Middleware** | `src/middleware.ts` | ⛔ Không chạm |
| **Layouts** | `src/app/layout.tsx`, `src/app/(auth)/layout.tsx`, `src/app/studio/layout.tsx` | ⛔ Không chạm |
| **UI Components** | `Header.tsx`, `Footer.tsx`, `Logo.tsx`, `GlassCard.tsx`, `DemoTTSBox.tsx` | ⛔ Không chạm |
| **Auth UI** | `AuthForm.tsx`, `CaptchaField.tsx` | ⛔ Không chạm |
| **Schemas** | `src/lib/schemas/auth.ts` | ⛔ Không chạm |
| **Other** | `src/lib/theme.tsx`, `src/lib/utils.ts`, `src/lib/db.ts` | ⛔ Không chạm |
| **Config** | `next.config.ts`, `tsconfig.json`, `prisma.config.ts` | ⛔ Không chạm |
| **Landing page** | `src/app/page.tsx` | ⛔ Không chạm |

---

## PHẦN B: CHI TIẾT TỪNG FILE SỬA

### B1. `prisma/schema.prisma` — Thêm 2 models

**Vị trí thay đổi:** Dòng 20 (thêm 2 relation fields) + cuối file (thêm 2 models)

**Dòng 20 hiện tại:**
```prisma
  sessions      Session[]
```

**Sau khi sửa (thêm 2 dòng ngay dưới dòng 20):**
```prisma
  sessions      Session[]
  generations   TTSGeneration[]    // 🆕 thêm
  voiceProfiles VoiceProfile[]     // 🆕 thêm
```

**Cuối file — thêm 2 models mới (sau model Session):**

```prisma
model TTSGeneration {
  id                 String   @id @default(cuid())
  userId             String
  text               String
  controlInstruction String   @default("")
  audioUrl           String        // R2 public/signed URL
  audioR2Key         String        // R2 object key (để xóa)
  language           String   @default("auto")
  cfgValue           Float    @default(2.0)
  ditSteps           Int      @default(6)
  doNormalize        Boolean  @default(false)
  denoise            Boolean  @default(false)
  usePromptText      Boolean  @default(false)
  promptText         String   @default("")
  voiceProfileId     String?
  createdAt          DateTime @default(now())

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  voiceProfile VoiceProfile? @relation(fields: [voiceProfileId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([createdAt])
}

model VoiceProfile {
  id          String   @id @default(cuid())
  userId      String
  name        String
  fileName    String
  r2Key       String          // R2 object key
  audioUrl    String          // R2 public/signed URL
  fileSize    Int
  mimeType    String   @default("audio/wav")
  description String   @default("")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  generations TTSGeneration[]

  @@index([userId])
}
```

**Ảnh hưởng:**
- Thêm relation vào User: **KHÔNG tạo cột mới** trong bảng User. Prisma chỉ dùng để generate TypeScript types. Bảng User giữ nguyên 100%.
- Migration mới sẽ **CHỈ tạo 2 bảng mới**, không sửa bảng User hay Session.
- Tất cả code auth hiện tại vẫn hoạt động bình thường vì không có gì thay đổi ở User/Session.

---

### B2. `src/components/studio/Sidebar.tsx` — Đổi 2 dòng href

**Vị trí: Dòng 19-20**

**Trước:**
```tsx
{ name: "Voice Library", href: "#", icon: Mic },
{ name: "History", href: "#", icon: History },
```

**Sau:**
```tsx
{ name: "Voice Library", href: "/studio/voices", icon: Mic },
{ name: "History", href: "/studio/history", icon: History },
```

**Ảnh hưởng:**
- Chỉ đổi giá trị string `"#"` → path thật.
- Không thêm/xóa import.
- Không thay đổi logic render.
- Nếu rollback: đổi lại thành `"#"`.
- **Rủi ro: ZERO** — nếu page chưa tồn tại, Next.js trả 404, không crash.

---

### B3. `src/components/studio/Workspace.tsx` — Thêm save-to-DB hook

**Vị trí: Dòng 148-159 (trong `handleGenerate`)**

**Code hiện tại (GIỮ NGUYÊN 100%):**
```tsx
} else if (result.audioUrl) {
    setCurrentAudio(result.audioUrl);
    const newItem: HistoryItem = {
        id: Date.now().toString(),
        text: text.substring(0, 120),
        audioUrl: result.audioUrl,
        date: new Date().toLocaleTimeString(),
        controlInstruction: controlInstruction.substring(0, 60),
    };
    const newHistory = [newItem, ...history].slice(0, 10);
    setHistory(newHistory);
    if (historyKey) localStorage.setItem(historyKey, JSON.stringify(newHistory));
}
```

**Sau khi sửa — THÊM 8 dòng, KHÔNG XÓA hay SỬA dòng nào:**
```tsx
} else if (result.audioUrl) {
    setCurrentAudio(result.audioUrl);
    const newItem: HistoryItem = {
        id: Date.now().toString(),
        text: text.substring(0, 120),
        audioUrl: result.audioUrl,
        date: new Date().toLocaleTimeString(),
        controlInstruction: controlInstruction.substring(0, 60),
    };
    const newHistory = [newItem, ...history].slice(0, 10);
    setHistory(newHistory);
    if (historyKey) localStorage.setItem(historyKey, JSON.stringify(newHistory));

    // --- 🆕 Persist to database (fire-and-forget, không block UI) ---
    fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            text, controlInstruction: ultimateCloning ? "" : controlInstruction,
            audioUrl: result.audioUrl, language, cfgValue, ditSteps,
            doNormalize, denoise, usePromptText: ultimateCloning, promptText,
        }),
    }).catch(() => {}); // Silent fail — localStorage vẫn hoạt động bình thường
}
```

**Ảnh hưởng:**
- Code cũ **GIỮ NGUYÊN 100%** — localStorage vẫn hoạt động như trước.
- Thêm 1 lệnh `fetch` fire-and-forget ở cuối block.
- Nếu API `/api/history` chưa tồn tại hoặc lỗi → `.catch(() => {})` nuốt lỗi → **không ảnh hưởng gì**.
- Nếu rollback: xóa 8 dòng comment + fetch → về lại trạng thái cũ.
- **Rủi ro: GẦN ZERO** — worst case là fetch fail silently.

---

## PHẦN C: CHI TIẾT TỪNG FILE MỚI

### C1. `src/lib/r2.ts` — R2 Client

```
Chức năng:
- Khởi tạo S3Client trỏ tới Cloudflare R2
- Export các hàm: uploadToR2(), deleteFromR2(), getSignedUrl()
- Đọc credentials từ env vars

Dependencies: @aws-sdk/client-s3
Env vars cần:
  R2_ACCOUNT_ID
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_BUCKET_NAME
  R2_PUBLIC_URL (optional — nếu bucket public)

Ảnh hưởng: Không. File mới, không import ở đâu cả cho đến khi API routes dùng.
```

### C2. `src/lib/api-utils.ts` — API Helpers

```
Chức năng:
- requireAuth(): Lấy user từ session, trả 401 nếu chưa đăng nhập
- jsonOk(data): Trả JSON { ok: true, data }
- jsonError(code, message, status): Trả JSON { ok: false, error }

Import từ: @/lib/auth/server (getCurrentUser — đã có sẵn)
Ảnh hưởng: Không. File mới độc lập.
```

### C3. `src/app/api/history/route.ts`

```
GET /api/history?page=1&limit=20
  - requireAuth()
  - prisma.tTSGeneration.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
  - Phân trang: skip, take
  - Trả: { items: [...], total, page, totalPages }

POST /api/history
  - requireAuth()
  - Nhận body: { text, controlInstruction, audioUrl, language, ... }
  - Tải audio file từ FastAPI audioUrl (http://127.0.0.1:8808/api/tts/file/xxx)
  - Upload lên R2 → nhận r2Key + r2Url
  - prisma.tTSGeneration.create({ data: { ...metadata, audioUrl: r2Url, audioR2Key: r2Key } })
  - (Optional) Xóa file local trên FastAPI: DELETE /api/tts/file/xxx
  - Trả: { id, audioUrl: r2Url }

DELETE /api/history
  - requireAuth()
  - Lấy tất cả generations của user
  - Xóa tất cả R2 files
  - prisma.tTSGeneration.deleteMany({ where: { userId } })

Ảnh hưởng: Endpoint hoàn toàn mới. Không conflict với bất kỳ route nào hiện có.
```

### C4. `src/app/api/history/[id]/route.ts`

```
DELETE /api/history/:id
  - requireAuth()
  - Kiểm tra ownership (generation.userId === currentUser.id)
  - Xóa file R2 (deleteFromR2)
  - prisma.tTSGeneration.delete({ where: { id } })

Ảnh hưởng: Không. Route mới.
```

### C5. `src/app/api/voices/route.ts`

```
GET /api/voices?page=1&limit=20
  - requireAuth()
  - prisma.voiceProfile.findMany({ where: { userId } })
  - Phân trang

POST /api/voices
  - requireAuth()
  - Nhận FormData: file (audio), name, description
  - Validate: file size (max 10MB), file type (audio/*)
  - Upload file lên R2 → r2Key, r2Url
  - prisma.voiceProfile.create({ data: { name, fileName, r2Key, audioUrl, fileSize, ... } })

Ảnh hưởng: Không. Route mới, không trùng với /api/auth/*.
```

### C6. `src/app/api/voices/[id]/route.ts`

```
GET /api/voices/:id — Chi tiết voice profile
PATCH /api/voices/:id — Cập nhật name/description
DELETE /api/voices/:id — Xóa voice + file R2

Ảnh hưởng: Không.
```

### C7. `src/app/api/voices/[id]/audio/route.ts`

```
GET /api/voices/:id/audio
  - requireAuth()
  - Lấy voice profile từ DB
  - Redirect tới R2 URL (hoặc proxy stream)
  - Dùng cho audio preview trong Voice Library

Ảnh hưởng: Không.
```

### C8. `src/app/studio/history/page.tsx`

```
Route: /studio/history
- Import HistoryList component
- Server component với metadata
- Nằm trong studio layout → tự động có Sidebar + auth guard

Ảnh hưởng: Không. Folder mới /studio/history/ không ảnh hưởng /studio/page.tsx.
```

### C9. `src/app/studio/voices/page.tsx`

```
Route: /studio/voices
- Import VoiceLibrary component
- Server component với metadata

Ảnh hưởng: Không.
```

### C10. `src/components/studio/HistoryList.tsx`

```
Client component "use client"
- Fetch /api/history (phân trang)
- Render danh sách: text preview, control instruction, thời gian
- Audio player inline (dùng R2 URL)
- Nút download, delete
- Nút "Clear All"
- Loading state, empty state
- Dùng design tokens hiện có (vox-surface, vox-primary, etc.)

Ảnh hưởng: Component mới, không sửa component nào hiện có.
```

### C11. `src/components/studio/VoiceLibrary.tsx`

```
Client component "use client"
- Upload zone (drag & drop) — tương tự Workspace reference upload
- Danh sách voice profiles
- Audio preview player
- Edit name/description
- Delete voice
- Nút "Use this voice" → copy R2 URL (dùng cho Workspace sau này)

Ảnh hưởng: Component mới.
```

---

## PHẦN D: THỨ TỰ TRIỂN KHAI

### Phase 1: Foundation (Database + R2 Client)

```
Bước 1.1: npm install @aws-sdk/client-s3
Bước 1.2: Tạo .env.local với R2 credentials  
Bước 1.3: Tạo src/lib/r2.ts
Bước 1.4: Tạo src/lib/api-utils.ts
Bước 1.5: Sửa prisma/schema.prisma (thêm 2 models + 2 relations)
Bước 1.6: npx prisma migrate dev --name add_history_voices
Bước 1.7: npx prisma generate
```

**Kiểm tra Phase 1:**
- `npx prisma studio` → thấy 4 bảng (User, Session, TTSGeneration, VoiceProfile)
- App hiện tại vẫn chạy bình thường → auth, studio, generate đều OK

**Rollback Phase 1:**
- Xóa file `r2.ts`, `api-utils.ts`
- Revert `schema.prisma` về bản cũ
- `npx prisma migrate reset` (chỉ khi cần)

---

### Phase 2: History API + UI

```
Bước 2.1: Tạo src/app/api/history/route.ts
Bước 2.2: Tạo src/app/api/history/[id]/route.ts
Bước 2.3: Test API bằng curl
Bước 2.4: Tạo src/components/studio/HistoryList.tsx
Bước 2.5: Tạo src/app/studio/history/page.tsx
Bước 2.6: Sửa Sidebar.tsx (1 dòng: href "#" → "/studio/history")
Bước 2.7: Sửa Workspace.tsx (thêm 8 dòng fetch sau generate)
Bước 2.8: Test end-to-end: Generate → History page hiển thị
```

**Kiểm tra Phase 2:**
- Generate audio trong Studio → history xuất hiện trong /studio/history
- localStorage history vẫn hoạt động trong Workspace (Recent Generations)
- Xóa history item → file R2 cũng bị xóa
- Auth vẫn hoạt động, Studio vẫn hoạt động

**Rollback Phase 2:**
- Xóa folders: `api/history/`, `studio/history/`
- Xóa file: `HistoryList.tsx`
- Revert 2 dòng trong `Sidebar.tsx` và `Workspace.tsx`

---

### Phase 3: Voice Library API + UI

```
Bước 3.1: Tạo src/app/api/voices/route.ts
Bước 3.2: Tạo src/app/api/voices/[id]/route.ts
Bước 3.3: Tạo src/app/api/voices/[id]/audio/route.ts
Bước 3.4: Test API bằng curl
Bước 3.5: Tạo src/components/studio/VoiceLibrary.tsx
Bước 3.6: Tạo src/app/studio/voices/page.tsx
Bước 3.7: Sửa Sidebar.tsx (1 dòng: href "#" → "/studio/voices")
Bước 3.8: Test: Upload voice → hiển thị trong library → play preview
```

**Kiểm tra Phase 3:**
- Upload audio → xuất hiện trong Voice Library
- Play preview hoạt động
- Delete voice → file R2 bị xóa
- Studio generate vẫn hoạt động bình thường

**Rollback Phase 3:**
- Xóa folders: `api/voices/`, `studio/voices/`
nvidia-utils-560
