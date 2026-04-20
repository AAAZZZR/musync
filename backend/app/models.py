"""SQLAlchemy ORM models — 對齊 Prisma schema（schema=app）。"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    preferred_mood: Mapped[str] = mapped_column(String, default="focus", nullable=False)
    daily_focus_minutes: Mapped[int] = mapped_column(Integer, default=90, nullable=False)
    background_volume: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    track_limit: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    plan: Mapped[str] = mapped_column(String, default="free", nullable=False)

    stripe_customer_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    stripe_price_id: Mapped[str | None] = mapped_column(String, nullable=True)
    stripe_current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    tos_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    tracks: Mapped[list[Track]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    focus_sessions: Mapped[list[FocusSession]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )
    generation_jobs: Mapped[list[GenerationJob]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )
    playback_sessions: Mapped[list[PlaybackSession]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )


class Track(Base):
    __tablename__ = "tracks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    profile_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    mood: Mapped[str] = mapped_column(String, nullable=False)
    prompt: Mapped[str] = mapped_column(String, nullable=False)
    storage_path: Mapped[str] = mapped_column(String, nullable=False)
    duration_sec: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(String, default="seed", nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    profile: Mapped[Profile] = relationship(back_populates="tracks")
    generation_job: Mapped[GenerationJob | None] = relationship(back_populates="track")

    __table_args__ = (
        Index("tracks_profile_id_idx", "profile_id"),
        Index("tracks_mood_idx", "mood"),
        Index("tracks_is_public_published_at_idx", "is_public", "published_at"),
    )


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    profile_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    mood: Mapped[str] = mapped_column(String, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    prompt: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(
        String,
        default="active",
        nullable=False,
        doc="active | paused | completed | abandoned",
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paused_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_paused_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    abandoned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    profile: Mapped[Profile] = relationship(back_populates="focus_sessions")

    __table_args__ = (
        Index("focus_sessions_profile_id_idx", "profile_id"),
        Index("focus_sessions_status_idx", "status"),
    )


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    profile_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    mood: Mapped[str] = mapped_column(String, nullable=False)
    prompt: Mapped[str] = mapped_column(String, nullable=False)
    prompt_normalized: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[str] = mapped_column(String, default="ace-1.5", nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending", nullable=False)
    duration_sec: Mapped[int] = mapped_column(Integer, nullable=False)
    track_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("tracks.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
    )
    provider_job_id: Mapped[str | None] = mapped_column(String, nullable=True)
    ace_task_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    profile: Mapped[Profile] = relationship(back_populates="generation_jobs")
    track: Mapped[Track | None] = relationship(back_populates="generation_job")

    __table_args__ = (
        Index("generation_jobs_profile_id_idx", "profile_id"),
        Index("generation_jobs_status_idx", "status"),
    )


class PlaybackSession(Base):
    __tablename__ = "playback_sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    profile_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    mood: Mapped[str] = mapped_column(String, nullable=False)
    prompt: Mapped[str] = mapped_column(String, nullable=False)
    prompt_normalized: Mapped[str] = mapped_column(String, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    profile: Mapped[Profile] = relationship(back_populates="playback_sessions")

    __table_args__ = (Index("playback_sessions_profile_id_idx", "profile_id"),)


class SeedTrack(Base):
    __tablename__ = "seed_tracks"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    mood: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    prompt: Mapped[str] = mapped_column(String, nullable=False)
    storage_path: Mapped[str] = mapped_column(String, nullable=False)
    duration_sec: Mapped[int] = mapped_column(Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    __table_args__ = (Index("seed_tracks_mood_idx", "mood"),)
