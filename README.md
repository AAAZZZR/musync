# MuSync MVP

Focus music web app: account login (email + Google), focus sessions, prompt-based background track generation.

## Stack
- Frontend: Next.js 16 (App Router, RSC + Server Actions) + shadcn/ui + Tailwind + zustand
- Backend: FastAPI + google-auth (in-memory state for MVP)
- Containerization: Docker (separate Dockerfile per service)

## Routes
| URL | 描述 |
|---|---|
| `/` | Landing |
| `/login`, `/signup` | Auth (email + Google OAuth) |
| `/app/dashboard` | 今日專注時數、active session、library 概覽 |
| `/app/play` | Composer + 大畫面 player |
| `/app/library` | 已生成的 tracks |
| `/app/sessions` | Focus session 歷史 |
| `/app/settings` | Profile / 偏好 |

Auth 使用 httpOnly cookie；middleware 守 `/app/*`，未登入 → `/login`、已登入打 auth 頁 → `/app/dashboard`。

## Local run

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env  # 填 GOOGLE_CLIENT_ID
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # 填 NEXT_PUBLIC_GOOGLE_CLIENT_ID
npm run dev
```

## Tests
```bash
# Backend
cd backend && python -m pytest tests/ -v

# Frontend unit
cd frontend && npm test

# Frontend e2e (auto starts backend + frontend)
cd frontend && npm run e2e
```

## Deployment (Zeabur)
- 兩個 service：`frontend/` 和 `backend/`，各自的 Dockerfile
- Push to `main` → Zeabur auto build & deploy
- Frontend env：`NEXT_PUBLIC_APP_URL`、`API_BASE_URL`、`NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- Backend env：`CORS_ALLOW_ORIGINS`、`GOOGLE_CLIENT_ID`

## Google OAuth setup
1. Google Cloud Console → 建 OAuth 2.0 Client ID（type: Web）
2. Authorized JavaScript origins: `https://<frontend-domain>` + `http://localhost:3000`
3. 不需要 Authorized redirect URIs（GIS popup 流程不用）
4. 同一個 Client ID 同時填到 frontend `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 和 backend `GOOGLE_CLIENT_ID`
