# MuSync

Focus music web app：prompt 生成專屬背景音樂、計時專注 session、track 收藏。

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Next.js 16  │ ──► │  FastAPI backend │ ──► │  Supabase    │
│  (SSR + RSC) │     │  (async + JWKS)  │     │  Postgres /  │
│              │     │                  │     │  Auth / Store│
└──────────────┘     └────────┬─────────┘     └──────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  ACE-Step 1.5    │
                     │  (RunPod GPU)    │
                     └──────────────────┘
```

- **Frontend** 是純 UI：沒有 DB 連線、沒有 Supabase SDK；所有 server action 透過 `serverFetch` 打 backend
- **Backend** 是唯一 DB 擁有者：async SQLAlchemy 2.0 + asyncpg + Alembic
- **Auth** 驗 Supabase JWT（JWKS ES256），session 存在 frontend httpOnly cookie（`mu_access` / `mu_refresh`）
- **Storage** Supabase bucket（private），backend 簽 1h TTL signed URL
- **生成** ACE-Step 1.5 跑在 RunPod，backend submit job → poll → 下載 wav → ffmpeg 轉 mp3 → 上傳 Storage

## Tech stack

| 層 | 技術 |
|---|---|
| Frontend | Next.js 16（App Router、RSC、Server Actions）、shadcn/ui、Tailwind、zustand、zod |
| Backend | FastAPI、SQLAlchemy 2.0 async、asyncpg、Alembic、httpx、python-jose |
| Data | Supabase Postgres（schema `app`）、Supabase Auth（email + Google OAuth）、Supabase Storage |
| ML | ACE-Step 1.5（外部 RunPod endpoint） |
| Payments | Stripe（checkout / portal / webhook，webhook 在 backend） |

## Features

- Supabase Auth：email signup / login、Google OAuth（PKCE，callback 在 backend）
- Focus session lifecycle：start / pause / resume / abandon / complete，3h stale 自動清
- 音樂生成：prompt + mood、single-pending rule、cancel、free plan 10/hr rate limit
- 帳號管理：改密碼、改 email、刪帳號、ToS
- Creator public page：`/app/creators/[id]`
- Stream quota：降級後超量自動 402 + upgrade 提示
- Stripe 升級 / 管理（key 填了才會跑）

## Local development

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env   # 填 DATABASE_URL / SUPABASE_* / ACE_* / STRIPE_*
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
cp .env.example .env.local   # API_BASE_URL / NEXT_PUBLIC_APP_URL
npm run dev
```

## Environment

**Frontend（`.env.local`）** — 極簡：
```
API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Backend（`.env`）**：
```
DATABASE_URL=postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_STORAGE_BUCKET=audio
ACE_API_BASE_URL=http://localhost:8002
ACE_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_ID_PRO=...
APP_URL=http://localhost:3000
CORS_ALLOW_ORIGINS=http://localhost:3000
```

## Supabase dashboard

- **Authentication → URL Configuration → Redirect URLs** 加 `<API_HOST>/api/auth/oauth/callback`
- **Authentication → Providers → Google** enabled

## Tests

```bash
cd backend && python -m pytest tests/        # 57 passed
cd frontend && npm test                      # 37 passed
cd frontend && npm run e2e                   # Playwright
```

## Deployment

前後端**獨立部署**（各自 Dockerfile，production-ready）。

1. **Backend** build `backend/Dockerfile` → 部到支援 Docker 的 PaaS（Zeabur / Fly / Railway）
   - Release command：`alembic upgrade head`
   - Start command：Dockerfile 內建 `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2`
   - 填齊上面的 env
2. **Frontend** build `frontend/Dockerfile` → 同平台或另一台
   - Next.js 16 standalone output，runtime image 精簡
   - 填 `API_BASE_URL`（指到 backend public URL）+ `NEXT_PUBLIC_APP_URL`
3. **CORS**：backend `CORS_ALLOW_ORIGINS` 加 frontend public URL
4. **Cookie 跨子 domain**：同父 domain 部署（例如 `app.example.com` + `api.example.com`）避免 SameSite 問題

ACE-Step model 另外跑在 GPU host（RunPod），經 SSH tunnel 或 public endpoint 由 backend 的 `ACE_API_BASE_URL` 連線。
