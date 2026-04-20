from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ace_client import close_client, init_client
from app.core.config import get_settings
from app.jwks import load_jwks
from app.routers import (
    auth,
    billing,
    catalog,
    community,
    creators,
    focus_sessions,
    generation,
    playback,
    profile,
    seed_tracks,
    stream,
    system,
    tracks,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await load_jwks()
    except Exception as e:
        import logging

        logging.getLogger(__name__).warning("JWKS preload failed: %s", e)
    if settings.ace_api_base_url:
        init_client()
    yield
    await close_client()


app = FastAPI(title="MuSync API", version="1.0.0", lifespan=lifespan)

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
app.include_router(tracks.router)
app.include_router(community.router)
app.include_router(creators.router)
app.include_router(focus_sessions.router)
app.include_router(generation.router)
app.include_router(playback.router)
app.include_router(seed_tracks.router)
app.include_router(stream.router)
app.include_router(billing.router)
