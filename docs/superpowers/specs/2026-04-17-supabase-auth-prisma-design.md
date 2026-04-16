# Supabase Auth + Prisma 資料庫設計 Spec

## §1 動機

目前 MuSync 全部是 in-memory：重啟就沒了、沒有真實 auth、沒有資料庫。要上線需要：

1. **Auth 搬前端** — 用 Supabase Auth（`@supabase/ssr`）處理 signup/login/Google OAuth/session，backend 不再管 auth
2. **加 Prisma + Supabase Postgres** — 從 Next.js Server Actions 直接操作資料庫，不經 backend
3. **Backend 精簡** — 只負責音樂生成（ACE API），接前端帶的 Supabase JWT 驗證身份

## §2 Scope

### In scope
- Supabase Auth 整合（email/password + Google OAuth）
- Prisma schema + migration 到 Supabase Postgres
- 前端 Server Actions 改用 Prisma 直接操作 DB
- Backend 精簡：移除 auth endpoints，只保留音樂生成相關
- Backend 改用 Supabase JWT 驗證（從 request header 拿 token → 驗 JWT → 取 user_id）
- Middleware 改用 Supabase session 判斷登入狀態

### Out of scope
- Stripe 付費功能（未來）
- 真實 ACE API 串接（維持 mock）
- Supabase Storage（音檔目前用外部 URL）
- Real-time / Subscriptions

### Future hook points
- `profiles.plan`、`profiles.credits` 欄位預留給 Stripe
- `generation_jobs.provider_job_id` 預留給真實 ACE API callback

## §3 Tech Stack 變更

| 層 | 舊 | 新 |
|---|---|---|
| Auth | Backend in-memory token | Supabase Auth（`@supabase/ssr`） |
| DB | Backend Python dict | Supabase Postgres + Prisma ORM |
| DB 操作 | Frontend → Backend API | Frontend Server Actions → Prisma |
| Backend auth | Bearer token → TOKENS dict | Supabase JWT → `jose` 驗證 |
| Google OAuth | Backend verify_oauth2_token | Supabase Auth Google provider |

新 dependencies：
- Frontend: `@supabase/supabase-js`, `@supabase/ssr`, `@prisma/client`, `prisma`（dev）
- Backend: `python-jose[cryptography]`（驗 JWT），移除 `google-auth`

## §4 Database Schema（Prisma）

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Profile {
  id                 String   @id @default(uuid())
  userId             String   @unique @map("user_id")
  email              String   @unique
  fullName           String   @map("full_name")
  onboardingComplete Boolean  @default(false) @map("onboarding_complete")
  preferredMood      String   @default("focus") @map("preferred_mood")
  dailyFocusMinutes  Int      @default(90) @map("daily_focus_minutes")
  backgroundVolume   Int      @default(60) @map("background_volume")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  tracks        Track[]
  focusSessions FocusSession[]
  generationJobs GenerationJob[]
  playbackSessions PlaybackSession[]

  @@map("profiles")
}

model Track {
  id          String   @id @default(uuid())
  profileId   String   @map("profile_id")
  title       String
  mood        String
  prompt      String
  streamUrl   String   @map("stream_url")
  durationSec Int      @map("duration_sec")
  source      String   @default("seed")
  createdAt   DateTime @default(now()) @map("created_at")

  profile       Profile        @relation(fields: [profileId], references: [id], onDelete: Cascade)
  generationJob GenerationJob? @relation

  @@index([profileId])
  @@index([mood])
  @@map("tracks")
}

model FocusSession {
  id              String    @id @default(uuid())
  profileId       String    @map("profile_id")
  title           String
  mood            String
  durationMinutes Int       @map("duration_minutes")
  prompt          String
  status          String    @default("active")
  startedAt       DateTime  @default(now()) @map("started_at")
  completedAt     DateTime? @map("completed_at")

  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
  @@index([status])
  @@map("focus_sessions")
}

model GenerationJob {
  id               String    @id @default(uuid())
  profileId        String    @map("profile_id")
  mood             String
  prompt           String
  promptNormalized String    @map("prompt_normalized")
  model            String    @default("ace-1.5")
  status           String    @default("pending")
  durationSec      Int       @map("duration_sec")
  trackId          String?   @unique @map("track_id")
  providerJobId    String?   @map("provider_job_id")
  createdAt        DateTime  @default(now()) @map("created_at")
  completedAt      DateTime? @map("completed_at")

  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  track   Track?  @relation(fields: [trackId], references: [id], onDelete: SetNull)

  @@index([profileId])
  @@index([status])
  @@map("generation_jobs")
}

model PlaybackSession {
  id               String   @id @default(uuid())
  profileId        String   @map("profile_id")
  mood             String
  prompt           String
  promptNormalized String   @map("prompt_normalized")
  startedAt        DateTime @default(now()) @map("started_at")

  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
  @@map("playback_sessions")
}

model SeedTrack {
  id          String @id @default(uuid())
  mood        String
  title       String
  prompt      String
  streamUrl   String @map("stream_url")
  durationSec Int    @map("duration_sec")
  sortOrder   Int    @default(0) @map("sort_order")

  @@index([mood])
  @@map("seed_tracks")
}
```

### 設計決策

1. **`Profile` 代替 `User`** — Supabase Auth 已有 `auth.users` table，我們不重複存密碼。`Profile.userId` 對應 `auth.users.id`（Supabase Auth UUID）。`email` 冗餘存一份方便查詢。

2. **`SeedTrack` 獨立 table** — 原本 seed tracks 是 startup 時硬塞進 TRACK_POOL 的。現在存 DB，由 admin seed script 寫入。跟 user-generated `Track` 分開，避免混淆。

3. **`PlaybackSession`** — 仍保留但只記錄 context（mood + prompt）。next track 邏輯改成從 `SeedTrack` 隨機撈 + 從該 user 的 `Track` 撈。

4. **所有 FK 指向 `Profile.id`**，不是 `auth.users.id` — Prisma 管自己的 table，不跨 Supabase auth schema。`Profile.userId` 是橋接。

5. **命名慣例** — Prisma model 用 PascalCase，DB column 用 snake_case（`@@map`）。

## §5 Auth 流程（改版後）

### Signup（Email）
```
Browser → Supabase Auth signUp(email, password)
       → Supabase 發 confirmation email（或 auto-confirm 看設定）
       → 確認後 session 自動設
       → middleware 偵測到 session → 放行 /app/*
       → /app/dashboard RSC 裡：getUser() → 查 profile，若無 → 建 Profile
```

### Login（Email）
```
Browser → Supabase Auth signInWithPassword(email, password)
       → session cookie 自動設定（@supabase/ssr 處理）
       → redirect /app/dashboard
```

### Google OAuth
```
Browser → Supabase Auth signInWithOAuth({ provider: 'google' })
       → redirect 到 Google consent → callback 回來
       → Supabase 自動建 auth.users record
       → session 自動設
       → /app/dashboard RSC：getUser() → 查 profile，若無 → 建 Profile
```

### Logout
```
Browser → Supabase Auth signOut()
       → cookie 清除
       → redirect /
```

### Middleware
```ts
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...)  // @supabase/ssr
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect('/login')
  }
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect('/app/dashboard')
  }
}
```

### Backend 驗證（音樂生成 API）
```
Frontend Server Action:
  1. getUser() 拿 Supabase access_token
  2. fetch(backend/api/generation/jobs, { Authorization: Bearer <access_token> })

Backend:
  1. 從 header 拿 JWT
  2. 用 Supabase JWT secret 驗證 + 解 payload
  3. 取 payload.sub 作為 user_id
  4. 查 Prisma profile（或信任 JWT，只需 user_id）
```

## §6 前端架構變更

### 新增 / 修改的檔案

```
frontend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                          ← seed tracks 寫入
│   └── migrations/                      ← auto-generated
├── src/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               ← browser client
│   │   │   ├── server.ts               ← server client (RSC / Server Actions)
│   │   │   └── middleware.ts            ← middleware client
│   │   ├── prisma.ts                    ← singleton PrismaClient
│   │   ├── server/
│   │   │   ├── api.ts                   ← 改：只用於打 backend 音樂生成 API
│   │   │   ├── auth.ts                  ← 改：用 Supabase getUser()
│   │   │   └── actions/
│   │   │       ├── auth.ts              ← 改：用 Supabase Auth
│   │   │       ├── profile.ts           ← 改：用 Prisma
│   │   │       ├── playback.ts          ← 改：用 Prisma + backend API
│   │   │       ├── focus-session.ts     ← 改：用 Prisma
│   │   │       └── generation.ts        ← 改：打 backend + Prisma 存結果
│   │   └── validation/
│   │       └── schemas.ts              ← 不變
│   ├── middleware.ts                    ← 改：用 Supabase session
│   └── components/features/auth/
│       ├── login-form.tsx              ← 改：用 Supabase signInWithPassword
│       ├── signup-form.tsx             ← 改：用 Supabase signUp
│       └── google-button.tsx           ← 改：用 Supabase signInWithOAuth
```

### Server Actions 改動摘要

| Action | 舊（serverFetch → backend） | 新 |
|--------|---------------------------|---|
| loginAction | POST /api/auth/login | `supabase.auth.signInWithPassword()` |
| signupAction | POST /api/auth/signup | `supabase.auth.signUp()` |
| googleAction | POST /api/auth/google | `supabase.auth.signInWithOAuth()` |
| logoutAction | POST /api/auth/logout | `supabase.auth.signOut()` |
| updateProfileAction | PATCH /api/profile | `prisma.profile.update()` |
| createFocusSessionAction | POST /api/focus-sessions | `prisma.focusSession.create()` |
| completeFocusSessionAction | POST /api/focus-sessions/:id/complete | `prisma.focusSession.update()` |
| startPlaybackAction | POST /api/play/start | `prisma.playbackSession.create()` + `prisma.seedTrack.findMany()` |
| nextTrackAction | POST /api/play/next | `prisma.seedTrack.findMany()` (round-robin or random) |
| createGenerationJobAction | POST /api/generation/jobs | serverFetch → backend（只有這個還打 backend） |

### Dashboard / Library / Sessions pages
- 全改用 Prisma 直接查：`prisma.focusSession.findMany({ where: { profileId } })`
- 不再打 backend API

## §7 Backend 精簡

### 保留的 endpoints
- `POST /api/generation/jobs` — 音樂生成（未來接 ACE API）
- `GET /api/generation/jobs` — 查詢生成任務狀態
- `GET /api/generation/jobs/:id` — 單一任務
- `GET /api/catalog/moods` — mood 列表（靜態，可選移到前端常數）
- `GET /api/health` — 健康檢查

### 移除的 endpoints
- `/api/auth/*` — 全部（改 Supabase Auth）
- `/api/profile` — 全部（改 Prisma）
- `/api/focus-sessions/*` — 全部（改 Prisma）
- `/api/play/*` — 全部（改 Prisma + 前端邏輯）
- `/api/library/*` — 全部（改 Prisma）

### Backend auth 改法
```python
# dependencies.py
from jose import jwt, JWTError

async def get_current_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"],
                             audience="authenticated")
        return payload["sub"]  # Supabase user UUID
    except JWTError:
        raise HTTPException(401, "Invalid token")
```

### Backend 移除的 dependencies
- `google-auth` — Google OAuth 改由 Supabase 處理
- `email-validator` — 前端 + Supabase 處理驗證

## §8 Seed Data

Prisma seed script (`prisma/seed.ts`) 寫入 `SeedTrack` table：

```ts
const MOODS = ["focus", "calm", "sleep", "rainy", "happy_chill", "night_drive"];
const LABELS: Record<string, string> = {
  focus: "Focus", calm: "Calm", sleep: "Sleep",
  rainy: "Rainy", happy_chill: "Happy Chill", night_drive: "Night Drive",
};

for (const mood of MOODS) {
  for (let i = 1; i <= 6; i++) {
    await prisma.seedTrack.upsert({
      where: { id: `${mood}_seed_${i}` },
      update: {},
      create: {
        id: `${mood}_seed_${i}`,
        mood,
        title: `${LABELS[mood]} Seed ${i}`,
        prompt: `Seed loop for ${mood}`,
        streamUrl: "https://samplelib.com/lib/preview/mp3/sample-3s.mp3",
        durationSec: 180,
        sortOrder: i,
      },
    });
  }
}
```

## §9 環境變數

### Frontend（.env.local）
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Prisma
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres

# Backend
API_BASE_URL=http://localhost:8000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Backend（.env）
```
SUPABASE_JWT_SECRET=<jwt-secret-from-supabase-dashboard>
ACE_API_BASE_URL=...
ACE_API_KEY=...
CORS_ALLOW_ORIGINS=http://localhost:3000
```

## §10 Migration 步驟（不丟資料的漸進式）

由於目前是 in-memory 沒有真實資料，直接切換即可：

1. 在 Supabase Dashboard 建 project（如果還沒有）
2. 啟用 Google OAuth provider
3. 前端加 Prisma + schema → `npx prisma migrate dev`
4. 跑 seed script
5. 前端改 auth → Supabase
6. 前端改 data access → Prisma
7. Backend 精簡 → 移除 auth/profile/sessions/library/play endpoints
8. Backend 改 auth → JWT 驗證
9. 測試全流程
10. Deploy
