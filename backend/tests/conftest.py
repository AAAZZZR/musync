import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    from app.state import GENERATION_JOBS

    GENERATION_JOBS.clear()

    from app.core.config import get_settings

    get_settings.cache_clear()

    from app.main import app

    return TestClient(app)


@pytest.fixture()
def auth_client(client):
    """Client with FastAPI dependency override for auth."""
    from app.dependencies import get_current_user_id
    from app.main import app

    app.dependency_overrides[get_current_user_id] = lambda: "test-user-id"
    yield client
    app.dependency_overrides.clear()
