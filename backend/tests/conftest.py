import os
import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(monkeypatch):
    # 清 ACE URL → 走 mock 模式
    monkeypatch.setenv("ACE_API_BASE_URL", "")

    # 清 cached settings + state
    from app.core.config import get_settings
    get_settings.cache_clear()

    from app.state import GENERATION_JOBS
    GENERATION_JOBS.clear()

    # 重新 import app（settings 已更新）
    from app.main import app
    return TestClient(app)


@pytest.fixture()
def auth_client(client):
    from app.dependencies import get_current_user_id
    from app.main import app

    app.dependency_overrides[get_current_user_id] = lambda: "test-user-id"
    yield client
    app.dependency_overrides.clear()
