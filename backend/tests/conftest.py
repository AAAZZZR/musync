import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id")
    # 重置 in-memory state
    from app.state import (
        FOCUS_SESSIONS,
        GENERATION_JOBS,
        PLAYBACK_SESSIONS,
        PROFILES,
        TOKENS,
        TRACK_LIBRARY,
        TRACK_POOL,
        USERS,
    )

    USERS.clear()
    TOKENS.clear()
    PROFILES.clear()
    GENERATION_JOBS.clear()
    TRACK_LIBRARY.clear()
    FOCUS_SESSIONS.clear()
    PLAYBACK_SESSIONS.clear()
    TRACK_POOL.clear()

    from app.core.config import get_settings

    get_settings.cache_clear()

    from app.main import app

    return TestClient(app)
