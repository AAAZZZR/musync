"""Stream quota 測試 — 降級後只能播最新 track_limit 首 private track。"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.db import get_session
from app.dependencies import get_optional_auth_user
from app.main import app
from app.models import Profile, Track
from app.schemas import AuthUser


@pytest.fixture
def client():
    return TestClient(app)


def _make_profile(track_limit: int = 5) -> Profile:
    return Profile(
        id="prof-1",
        user_id="user-1",
        email="r@x.com",
        full_name="Rudy",
        onboarding_complete=True,
        preferred_mood="focus",
        daily_focus_minutes=90,
        background_volume=60,
        track_limit=track_limit,
        plan="free",
    )


def _make_track(track_id: str = "track-abc", is_public: bool = False) -> Track:
    return Track(
        id=track_id,
        profile_id="prof-1",
        title="t",
        mood="focus",
        prompt="p",
        storage_path=f"path/{track_id}.wav",
        duration_sec=600,
        source="generated",
        is_public=is_public,
        published_at=datetime(2026, 4, 1, tzinfo=timezone.utc) if is_public else None,
        created_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
    )


async def _override_auth() -> AuthUser:
    return AuthUser(id="user-1", email="r@x.com", full_name="Rudy")


def _setup_session(profile, track, total_tracks: int, allowed_ids: list[str] | None = None):
    """建一個 mock session 模擬 stream endpoint 要的 query。

    Order 對應 endpoint 的呼叫：
    1. session.get(Track, id) → track
    2. session.scalar(select Profile where user_id) → profile
    3. session.scalar(count) → total_tracks
    4. session.scalars(allowed ids query) → allowed_ids
    """
    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=track)

    scalar_calls = [profile, total_tracks]
    mock_session.scalar = AsyncMock(side_effect=scalar_calls)

    if allowed_ids is not None:
        mock_scalar_result = MagicMock()
        mock_scalar_result.all = MagicMock(return_value=allowed_ids)
        mock_session.scalars = AsyncMock(return_value=mock_scalar_result)

    return mock_session


def test_public_track_skips_quota_check(client):
    """public track 不檢查 quota — 降級後公開作品還是該能播。"""
    track = _make_track("t-public", is_public=True)
    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=track)

    async def override_get_session():
        yield mock_session

    app.dependency_overrides[get_session] = override_get_session
    try:
        with patch(
            "app.routers.stream.create_signed_url",
            new=AsyncMock(return_value="https://signed.example/url"),
        ):
            res = client.get("/api/stream/track/t-public")
            assert res.status_code == 200
            # profile lookup 不該被呼叫（public path short-circuit）
            mock_session.scalar.assert_not_called()
    finally:
        app.dependency_overrides.clear()


def test_private_track_non_owner_blocked_403(client):
    """非 owner 看別人私人 track → 403。"""
    other_track = Track(
        id="t-other",
        profile_id="someone-else",
        title="t",
        mood="focus",
        prompt="p",
        storage_path="path/x.wav",
        duration_sec=600,
        source="generated",
        is_public=False,
        created_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
    )
    profile = _make_profile()
    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=other_track)
    mock_session.scalar = AsyncMock(return_value=profile)

    async def override_get_session():
        yield mock_session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_optional_auth_user] = _override_auth
    try:
        res = client.get(
            "/api/stream/track/t-other",
            headers={"Authorization": "Bearer fake"},
        )
        assert res.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_owner_at_limit_all_tracks_allowed(client):
    """track_limit=5, 擁有 5 首 → total(5) > limit(5) 為 False → 全部放行。"""
    profile = _make_profile(track_limit=5)
    track = _make_track("t-within", is_public=False)

    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=track)
    mock_session.scalar = AsyncMock(side_effect=[profile, 5])  # profile lookup, count

    async def override_get_session():
        yield mock_session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_optional_auth_user] = _override_auth
    try:
        with patch(
            "app.routers.stream.create_signed_url",
            new=AsyncMock(return_value="https://signed.example/ok"),
        ):
            res = client.get(
                "/api/stream/track/t-within",
                headers={"Authorization": "Bearer fake"},
            )
            assert res.status_code == 200
            # allowed_ids query 不該被跑
            mock_session.scalars.assert_not_called()
    finally:
        app.dependency_overrides.clear()


def test_owner_over_limit_newest_allowed(client):
    """track_limit=5, 擁有 6 首，請求的是最新 5 首其中之一 → 200。"""
    profile = _make_profile(track_limit=5)
    track = _make_track("t-new", is_public=False)

    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=track)
    mock_session.scalar = AsyncMock(side_effect=[profile, 6])  # over limit

    mock_scalar_result = MagicMock()
    mock_scalar_result.all = MagicMock(
        return_value=["t-new", "t-4", "t-3", "t-2", "t-1"]
    )
    mock_session.scalars = AsyncMock(return_value=mock_scalar_result)

    async def override_get_session():
        yield mock_session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_optional_auth_user] = _override_auth
    try:
        with patch(
            "app.routers.stream.create_signed_url",
            new=AsyncMock(return_value="https://signed.example/ok"),
        ):
            res = client.get(
                "/api/stream/track/t-new",
                headers={"Authorization": "Bearer fake"},
            )
            assert res.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_owner_over_limit_oldest_blocked_402(client):
    """track_limit=5, 擁有 6 首，請求的是最舊那首 → 402 + upgrade message。"""
    profile = _make_profile(track_limit=5)
    track = _make_track("t-oldest", is_public=False)

    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=track)
    mock_session.scalar = AsyncMock(side_effect=[profile, 6])

    mock_scalar_result = MagicMock()
    # allowed set 不含 t-oldest
    mock_scalar_result.all = MagicMock(
        return_value=["t-6", "t-5", "t-4", "t-3", "t-2"]
    )
    mock_session.scalars = AsyncMock(return_value=mock_scalar_result)

    async def override_get_session():
        yield mock_session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_optional_auth_user] = _override_auth
    try:
        res = client.get(
            "/api/stream/track/t-oldest",
            headers={"Authorization": "Bearer fake"},
        )
        assert res.status_code == 402
        assert "upgrade" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_heavy_downgrade_scenario_only_5_of_500_playable(client):
    """Pro→Free：500 首變只能播 5 首；第 6 老的就擋。"""
    profile = _make_profile(track_limit=5)
    track = _make_track("t-200", is_public=False)

    mock_session = MagicMock()
    mock_session.get = AsyncMock(return_value=track)
    mock_session.scalar = AsyncMock(side_effect=[profile, 500])

    mock_scalar_result = MagicMock()
    # t-200 不在最新 5 首
    mock_scalar_result.all = MagicMock(
        return_value=["t-500", "t-499", "t-498", "t-497", "t-496"]
    )
    mock_session.scalars = AsyncMock(return_value=mock_scalar_result)

    async def override_get_session():
        yield mock_session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_optional_auth_user] = _override_auth
    try:
        res = client.get(
            "/api/stream/track/t-200",
            headers={"Authorization": "Bearer fake"},
        )
        assert res.status_code == 402
    finally:
        app.dependency_overrides.clear()
