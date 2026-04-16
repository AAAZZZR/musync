# MuSync MVP

MVP for mood-based endless Lo-fi playback with prompt bar control.

## Stack
- Frontend: Next.js 14 (App Router)
- Backend API: FastAPI
- Containerization: Docker (separate Dockerfile per service)

## Product Behavior (Strategy B)
Prompt input does **not** block immediate playback. Playback starts from existing mood pool first, while prompt is used to enqueue future generation jobs.

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

## API overview
- `POST /api/play/start`: start session with mood + prompt
- `POST /api/play/next`: fetch next track in session mood
- `GET /api/generation/jobs`: inspect queued prompt-driven generation jobs
- `GET /api/health`: health check

## Deployment notes (Zeabur)
Deploy `frontend` and `backend` as two separate services, each using its own Dockerfile.

- Backend service root: `backend/`
- Frontend service root: `frontend/`
- Frontend env: `NEXT_PUBLIC_API_BASE=https://<your-backend-domain>`
