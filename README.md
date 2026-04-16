# MuSync MVP

MVP for a focus music web app with account login, focus sessions, and prompt-based background track generation.

## Stack
- Frontend: Next.js 14 (App Router)
- Backend API: FastAPI
- Containerization: Docker (separate Dockerfile per service)

## Product Behavior
- Users can sign up and log in from the website
- Users can create focus sessions with a mood, title, duration, and prompt
- Users can generate tracks through the backend generation API configured for ACE 1.5
- Playback can start immediately from the seeded pool while generated tracks accumulate in the user library

## Local run (Docker)
```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

## Local run (without Docker)
### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Set API base URL if needed:
```bash
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

Environment examples:
- `frontend/.env.example`
- `backend/.env.example`

Recommended MVP stack:
- Database/Auth/Storage: Supabase
- Music generation model: ACE 1.5 via backend-only API key

## API overview
- `POST /api/auth/signup`: create an account
- `POST /api/auth/login`: log in and receive bearer token
- `POST /api/auth/logout`: invalidate current token
- `GET /api/auth/me`: get current user
- `GET /api/profile`: get user profile
- `PATCH /api/profile`: update focus preferences
- `GET /api/catalog/moods`: list supported moods
- `POST /api/focus-sessions`: create a focus session
- `GET /api/focus-sessions`: list current user's focus sessions
- `GET /api/focus-sessions/{session_id}`: fetch one focus session
- `POST /api/focus-sessions/{session_id}/complete`: complete a focus session
- `POST /api/play/start`: start playback session with mood + prompt
- `POST /api/play/next`: fetch next track in playback session
- `POST /api/generation/jobs`: create a generation job
- `GET /api/generation/jobs`: list current user's generation jobs
- `GET /api/generation/jobs/{job_id}`: fetch one generation job
- `GET /api/library/tracks`: list current user's generated tracks
- `GET /api/health`: health check and provider config status

## Deployment notes (Zeabur)
Deploy `frontend` and `backend` as two separate services, each using its own Dockerfile.

- Backend service root: `backend/`
- Frontend service root: `frontend/`
- Frontend env: `NEXT_PUBLIC_API_BASE=https://<your-backend-domain>`
