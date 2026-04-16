from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import auth, catalog, focus_sessions, generation, library, playback, profile, system
from app.state import seed_tracks

settings = get_settings()
seed_tracks()

app = FastAPI(title="MuSync API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router)
app.include_router(catalog.router)
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(playback.router)
app.include_router(generation.router)
app.include_router(library.router)
app.include_router(focus_sessions.router)
