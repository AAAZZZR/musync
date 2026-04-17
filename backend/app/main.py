from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ace_client import close_client, init_client
from app.core.config import get_settings
from app.routers import catalog, generation, system

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: 初始化 ACE httpx client（如果有設定）
    if settings.ace_api_base_url:
        init_client()
    yield
    # Shutdown: 關閉 httpx client
    await close_client()


app = FastAPI(title="MuSync API", version="0.4.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router)
app.include_router(catalog.router)
app.include_router(generation.router)
