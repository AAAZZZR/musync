"""Async SQLAlchemy engine + session factory。App schema 為預設."""

from collections.abc import AsyncGenerator

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


def _async_url(url: str) -> str:
    """postgresql://... → postgresql+asyncpg://..."""
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://") :]
    return url


settings = get_settings()
engine = create_async_engine(
    _async_url(settings.database_url),
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    """Declarative base — 所有 model 繼承，預設 schema = app。"""

    metadata = MetaData(schema="app")


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dep：每個 request 一個 session。"""
    async with AsyncSessionLocal() as session:
        yield session
