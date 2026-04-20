"""Creator profile endpoint tests — route registration + 404 邊界 + happy path。

Note: main.py 尚未 include creators router（主 agent 收尾時補 register）。
為了自動化跑 smoke，test 先 include 一次再驗。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.db import get_session
from app.main import app
from app.models import Profile, Track
from app.routers import creators as creators_router

_ALREADY_INCLUDED = any(
    getattr(r, "path", "") == "/api/creators/{profile_id}" for r in app.routes
)
if not _ALREADY_INCLUDED:
    app.include_router(creators_router.router)


@pytest.fixture
def client():
    return TestClient(app)


def _make_profile(profile_id: str = "prof-1", full_name: str = "Rudy") -> Profile:
    return Profile(
        id=profile_id,
        user_id="user-1",
        email="r@x.com",
        full_name=full_name,
        onboarding_complete=True,
        preferred_mood="focus",
        daily_focus_minutes=90,
        background_volume=60,
        track_limit=5,
        plan="free",
    )


def _make_track(
    track_id: str,
    profile_id: str = "prof-1",
    title: str = "Song",
    is_public: bool = True,
) -> Track:
    return Track(
        id=track_id,
        profile_id=profile_id,
        title=title,
        mood="focus",
        prompt="p",
        storage_path=f"path/{track_id}.wav",
        duration_sec=600,
        source="generated",
        is_public=is_public,
        published_at=datetime(2026, 4, 1, tzinfo=timezone.utc) if is_public else None,
        created_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
    )


def test_route_registered(client):
    routes = {r.path for r in client.app.routes if hasattr(r, "path")}
    assert "/api/creators/{profile_id}" in routes


def test_creator_not_found(client):
    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=None)

    async def override_get_session():
        yield mock_session

    app.dependency_overrides[get_session] = override_get_session
    try:
        res = client.get("/api/creators/nonexistent")
        assert res.status_code == 404
        assert res.json()["detail"] == "Creator not found"
    finally:
        app.dependency_overrides.clear()


def test_creator_no_public_tracks_returns_404(client):
    profile = _make_profile()
    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=profile)
    # total_public_tracks = 0
    mock_session.scalar = AsyncMock(return_value=0)

    async def override_get_session():
        yield mock_session

    app.dependency_overrides[get_session] = override_get_session
    try:
        res = client.get("/api/creators/prof-1")
        assert res.status_code == 404
        assert res.json()["detail"] == "Creator has no public tracks"
    finally:
        app.dependency_overrides.clear()


def test_creator_happy_path(client):
    profile = _make_profile()
    tracks = [_make_track(f"t-{i}") for i in range(3)]

    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=profile)
    mock_session.scalar = AsyncMock(return_value=3)

    mock_scalar_result = MagicMock()
    mock_scalar_result.__iter__ = lambda self: iter(tracks)
    mock_session.scalars = AsyncMock(return_value=mock_scalar_result)

    async def override_get_session():
        yield mock_session

    app.dependency_overrides[get_session] = override_get_session
    try:
        res = client.get("/api/creators/prof-1")
        assert res.status_code == 200
        body = res.json()
        assert body["id"] == "prof-1"
        assert body["full_name"] == "Rudy"
        assert body["total_public_tracks"] == 3
        assert len(body["tracks"]) == 3
        assert all(t["creator"] == "Rudy" for t in body["tracks"])
        assert all(t["is_public"] for t in body["tracks"])
    finally:
        app.dependency_overrides.clear()


def test_creator_total_count_can_exceed_list_limit(client):
    """假設 creator 有 150 首公開曲目，tracks 被 limit 到 100，但 total 要回真實數字。"""
    profile = _make_profile()
    tracks = [_make_track(f"t-{i}") for i in range(100)]  # 模擬 limit 100 後的結果

    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=profile)
    mock_session.scalar = AsyncMock(return_value=150)  # 真實總數

    mock_scalar_result = MagicMock()
    mock_scalar_result.__iter__ = lambda self: iter(tracks)
    mock_session.scalars = AsyncMock(return_value=mock_scalar_result)

    async def override_get_session():
        yield mock_session

    app.dependency_overrides[get_session] = override_get_session
    try:
        res = client.get("/api/creators/prof-1")
        assert res.status_code == 200
        body = res.json()
        assert body["total_public_tracks"] == 150
        assert len(body["tracks"]) == 100
    finally:
        app.dependency_overrides.clear()


def test_creator_endpoint_is_public_no_auth_required(client):
    """不帶 Authorization header 也能 access — 不應回 401。"""
    profile = _make_profile()
    tracks = [_make_track("t-1")]

    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=profile)
    mock_session.scalar = AsyncMock(return_value=1)

    mock_scalar_result = MagicMock()
    mock_scalar_result.__iter__ = lambda self: iter(tracks)
    mock_session.scalars = AsyncMock(return_value=mock_scalar_result)

    async def override_get_session():
        yield mock_session

    app.dependency_overrides[get_session] = override_get_session
    try:
        # 無 Authorization header
        res = client.get("/api/creators/prof-1")
        assert res.status_code == 200
    finally:
        app.dependency_overrides.clear()
