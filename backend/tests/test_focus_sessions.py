"""Focus session lifecycle tests — route 註冊、auth gate、transition 驗證。

沒有 test DB → 用 dependency_overrides 替換 `get_current_profile` / `get_session`，
把 FocusSession row 放進 fake session 裡跑 transition。
"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.db import get_session
from app.dependencies import get_current_profile
from app.main import app
from app.models import FocusSession, Profile


# ---- route registration ----


def test_focus_session_routes_registered(client: TestClient):
    routes = {(r.path, tuple(sorted(r.methods))) for r in client.app.routes if hasattr(r, "methods")}
    expected = {
        ("/api/focus-sessions", ("GET",)),
        ("/api/focus-sessions", ("POST",)),
        ("/api/focus-sessions/{session_id}/complete", ("POST",)),
        ("/api/focus-sessions/{session_id}/pause", ("POST",)),
        ("/api/focus-sessions/{session_id}/resume", ("POST",)),
        ("/api/focus-sessions/{session_id}/abandon", ("POST",)),
    }
    for path, methods in expected:
        assert any(r.path == path and methods[0] in r.methods for r in client.app.routes if hasattr(r, "methods")), (
            f"{methods[0]} {path} not registered"
        )


# ---- auth gate（未登入 401）----


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/api/focus-sessions"),
        ("POST", "/api/focus-sessions"),
        ("POST", "/api/focus-sessions/00000000-0000-0000-0000-000000000000/complete"),
        ("POST", "/api/focus-sessions/00000000-0000-0000-0000-000000000000/pause"),
        ("POST", "/api/focus-sessions/00000000-0000-0000-0000-000000000000/resume"),
        ("POST", "/api/focus-sessions/00000000-0000-0000-0000-000000000000/abandon"),
    ],
)
def test_unauthenticated_rejected(client: TestClient, method: str, path: str):
    res = client.request(method, path, json={} if method == "POST" else None)
    assert res.status_code == 401


# ---- transition 測試（fake session + overrides）----


class _FakeSession:
    """假的 AsyncSession — 用一個 dict 存 FocusSession，支援 get / add / commit / refresh。"""

    def __init__(self, rows: dict[str, FocusSession]):
        self.rows = rows
        self.pending: list[FocusSession] = []

    async def get(self, model, pk):
        return self.rows.get(pk)

    def add(self, row):
        self.pending.append(row)

    async def commit(self):
        for row in self.pending:
            self.rows[row.id] = row
        self.pending.clear()

    async def refresh(self, row):
        return row

    async def scalars(self, stmt):
        # stale cleanup 用；我們的 transition 測試不會產生 stale，回空 list 即可。
        return iter([])

    async def execute(self, stmt):
        return None


def _make_profile(profile_id: str = None) -> Profile:
    profile_id = profile_id or str(uuid4())
    profile = Profile(
        id=profile_id,
        user_id=str(uuid4()),
        email=f"{profile_id[:8]}@test.local",
        full_name="Test User",
    )
    return profile


def _make_session_row(profile_id: str, status: str = "active", **kwargs) -> FocusSession:
    row = FocusSession(
        id=str(uuid4()),
        profile_id=profile_id,
        title="Test",
        mood="focus",
        duration_minutes=30,
        prompt="lofi",
        status=status,
        started_at=datetime.now(UTC),
        total_paused_seconds=0,
    )
    for k, v in kwargs.items():
        setattr(row, k, v)
    return row


@pytest.fixture
def fake_client(client: TestClient):
    """提供一個已注入 fake profile + fake session 的 client。

    yield (client, profile, rows_dict) —— rows_dict 讓測試預置 FocusSession row。
    """
    profile = _make_profile()
    rows: dict[str, FocusSession] = {}
    fake = _FakeSession(rows)

    async def _override_profile():
        return profile

    async def _override_session():
        yield fake

    app.dependency_overrides[get_current_profile] = _override_profile
    app.dependency_overrides[get_session] = _override_session
    try:
        yield client, profile, rows
    finally:
        app.dependency_overrides.clear()


def test_pause_active_session(fake_client):
    client, profile, rows = fake_client
    row = _make_session_row(profile.id, status="active")
    rows[row.id] = row

    res = client.post(f"/api/focus-sessions/{row.id}/pause")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "paused"
    assert body["paused_at"] is not None


def test_pause_already_paused_is_409(fake_client):
    client, profile, rows = fake_client
    row = _make_session_row(profile.id, status="paused", paused_at=datetime.now(UTC))
    rows[row.id] = row

    res = client.post(f"/api/focus-sessions/{row.id}/pause")
    assert res.status_code == 409


def test_pause_completed_is_409(fake_client):
    client, profile, rows = fake_client
    row = _make_session_row(profile.id, status="completed", completed_at=datetime.now(UTC))
    rows[row.id] = row

    res = client.post(f"/api/focus-sessions/{row.id}/pause")
    assert res.status_code == 409


def test_resume_paused_accumulates_seconds(fake_client):
    client, profile, rows = fake_client
    paused_at = datetime.now(UTC) - timedelta(seconds=30)
    row = _make_session_row(
        profile.id,
        status="paused",
        paused_at=paused_at,
        total_paused_seconds=10,
    )
    rows[row.id] = row

    res = client.post(f"/api/focus-sessions/{row.id}/resume")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "active"
    assert body["paused_at"] is None
    # 原本累積 10s + 這次 ~30s ≈ 40s（容忍執行抖動）
    assert 39 <= body["total_paused_seconds"] <= 41


def test_resume_active_is_409(fake_client):
    client, profile, rows = fake_client
    row = _make_session_row(profile.id, status="active")
    rows[row.id] = row

    res = client.post(f"/api/focus-sessions/{row.id}/resume")
    assert res.status_code == 409


def test_abandon_active(fake_client):
    client, profile, rows = fake_client
    row = _make_session_row(profile.id, status="active")
    rows[row.id] = row

    res = client.post(f"/api/focus-sessions/{row.id}/abandon")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "abandoned"
    assert body["abandoned_at"] is not None


def test_abandon_paused(fake_client):
    client, profile, rows = fake_client
    row = _make_session_row(profile.id, status="paused", paused_at=datetime.now(UTC))
    rows[row.id] = row

    res = client.post(f"/api/focus-sessions/{row.id}/abandon")
    assert res.status_code == 200
    assert res.json()["status"] == "abandoned"


def test_abandon_completed_is_409(fake_client):
    client, profile, rows = fake_client
    row = _make_session_row(profile.id, status="completed", completed_at=datetime.now(UTC))
    rows[row.id] = row

    res = client.post(f"/api/focus-sessions/{row.id}/abandon")
    assert res.status_code == 409


def test_abandon_other_user_session_is_403(fake_client):
    client, profile, rows = fake_client
    other = _make_session_row(profile_id=str(uuid4()), status="active")  # 別人的 session
    rows[other.id] = other

    res = client.post(f"/api/focus-sessions/{other.id}/abandon")
    assert res.status_code == 403


def test_action_on_missing_session_is_404(fake_client):
    client, _profile, _rows = fake_client
    missing = "00000000-0000-0000-0000-000000000000"

    for action in ("pause", "resume", "abandon", "complete"):
        res = client.post(f"/api/focus-sessions/{missing}/{action}")
        assert res.status_code == 404, f"{action} should be 404 on missing id"
