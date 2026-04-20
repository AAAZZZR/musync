"""Generation throttling tests — single-pending + cancel + free-plan rate-limit。

沒有 test DB → 用 dependency_overrides 換掉 `get_current_profile` / `get_session`，
並 mock `submit_task` 避免真正 call ACE HTTP API。
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.db import get_session
from app.dependencies import get_current_profile
from app.main import app
from app.models import GenerationJob, Profile, Track


# ---- Route registration + auth gate ----


def test_cancel_route_registered(client: TestClient):
    paths_methods = {
        (r.path, tuple(sorted(r.methods)))
        for r in client.app.routes
        if hasattr(r, "methods") and r.methods
    }
    assert any(
        path == "/api/generation/jobs/{job_id}/cancel" and "POST" in methods
        for path, methods in paths_methods
    ), "POST /api/generation/jobs/{job_id}/cancel not registered"


@pytest.mark.parametrize(
    "method,path",
    [
        ("POST", "/api/generation/jobs"),
        ("GET", "/api/generation/jobs"),
        ("GET", "/api/generation/jobs/00000000-0000-0000-0000-000000000000"),
        ("POST", "/api/generation/jobs/00000000-0000-0000-0000-000000000000/cancel"),
    ],
)
def test_unauthenticated_rejected(client: TestClient, method: str, path: str):
    res = client.request(
        method,
        path,
        json={"mood": "focus", "prompt": "lofi"} if method == "POST" and path.endswith("/jobs") else None,
    )
    assert res.status_code == 401


# ---- Fake DB session ----


class _FakeSession:
    """支援 cancel + create 所需的 session 行為。

    Scalar 回傳策略：inspect SQL 決定 — 避免依賴呼叫順序導致 pro plan 對不齊。

    - count(GenerationJob) where status=='pending' → `pending_count`
    - count(GenerationJob) 其他（即 rate-limit 的 created_at > cutoff） → `recent_count`
    - count(Track) → `track_count`
    """

    def __init__(
        self,
        rows: dict[str, GenerationJob] | None = None,
        *,
        recent_count: int = 0,
        pending_count: int = 0,
        track_count: int = 0,
    ):
        self.rows: dict[str, GenerationJob] = rows or {}
        self.recent_count = recent_count
        self.pending_count = pending_count
        self.track_count = track_count
        self.scalar_calls: list[str] = []  # 供 test 檢查 endpoint 實際呼叫了哪些 query
        self.pending: list[object] = []

    async def get(self, model, pk):
        if model is GenerationJob:
            return self.rows.get(pk)
        if model is Track:
            return None
        return None

    async def scalar(self, stmt):
        sql = str(stmt).lower()
        # 判斷是在 count 哪個 table / 條件
        if "generation_jobs" in sql:
            if "status" in sql:
                self.scalar_calls.append("pending_count")
                return self.pending_count
            self.scalar_calls.append("recent_count")
            return self.recent_count
        if "tracks" in sql:
            self.scalar_calls.append("track_count")
            return self.track_count
        return 0

    async def scalars(self, stmt):
        return iter([])

    def add(self, row):
        self.pending.append(row)

    async def commit(self):
        for row in self.pending:
            if isinstance(row, GenerationJob):
                if not row.id:
                    row.id = str(uuid4())
                self.rows[row.id] = row
        self.pending.clear()

    async def refresh(self, row):
        if isinstance(row, GenerationJob):
            if row.created_at is None:
                row.created_at = datetime.now(UTC)
            if row.status is None:
                row.status = "pending"
        return row


def _make_profile(plan: str = "free", track_limit: int = 5) -> Profile:
    return Profile(
        id=str(uuid4()),
        user_id=str(uuid4()),
        email="rudy@test.local",
        full_name="Rudy",
        onboarding_complete=True,
        preferred_mood="focus",
        daily_focus_minutes=90,
        background_volume=60,
        track_limit=track_limit,
        plan=plan,
    )


def _make_job(profile_id: str, status: str = "pending", **kwargs) -> GenerationJob:
    job = GenerationJob(
        id=str(uuid4()),
        profile_id=profile_id,
        mood="focus",
        prompt="lofi",
        prompt_normalized="lofi (focus)",
        model="ace-1.5",
        status=status,
        duration_sec=180,
        ace_task_id="ace-task-xyz",
        created_at=datetime.now(UTC),
    )
    for k, v in kwargs.items():
        setattr(job, k, v)
    return job


@pytest.fixture
def override_ace_configured():
    """確保 `get_settings().ace_api_base_url` 在 create_job 檢查時是 truthy。"""
    settings = get_settings()
    original = settings.ace_api_base_url
    settings.ace_api_base_url = "https://ace.example"
    try:
        yield
    finally:
        settings.ace_api_base_url = original


def _override_deps(profile: Profile, fake: _FakeSession):
    async def _op():
        return profile

    async def _os():
        yield fake

    app.dependency_overrides[get_current_profile] = _op
    app.dependency_overrides[get_session] = _os


def _clear_deps():
    app.dependency_overrides.clear()


# ---- Single-pending ----


def test_create_rejected_when_pending_exists(client, override_ace_configured):
    profile = _make_profile(plan="free")
    fake = _FakeSession(recent_count=0, pending_count=1, track_count=0)
    _override_deps(profile, fake)
    try:
        res = client.post(
            "/api/generation/jobs",
            json={"mood": "focus", "prompt": "lofi", "duration_sec": 180},
        )
        assert res.status_code == 429
        assert "already in progress" in res.json()["detail"]
    finally:
        _clear_deps()


def test_create_allowed_when_no_pending(client, override_ace_configured):
    profile = _make_profile(plan="free")
    fake = _FakeSession(recent_count=0, pending_count=0, track_count=0)
    _override_deps(profile, fake)
    try:
        with patch(
            "app.routers.generation.submit_task",
            new=AsyncMock(return_value="ace-task-new"),
        ):
            res = client.post(
                "/api/generation/jobs",
                json={"mood": "focus", "prompt": "lofi", "duration_sec": 180},
            )
            assert res.status_code == 200, res.json()
            body = res.json()
            assert body["status"] == "pending"
            assert body["ace_task_id"] == "ace-task-new"
    finally:
        _clear_deps()


# ---- Rate limit ----


def test_free_plan_rate_limit_at_threshold_rejected(client, override_ace_configured):
    profile = _make_profile(plan="free")
    # 10 個 in last hour → 擋
    fake = _FakeSession(recent_count=10, pending_count=0, track_count=0)
    _override_deps(profile, fake)
    try:
        res = client.post(
            "/api/generation/jobs",
            json={"mood": "focus", "prompt": "lofi", "duration_sec": 180},
        )
        assert res.status_code == 429
        assert "10 generations/hour" in res.json()["detail"]
        assert "free plan" in res.json()["detail"]
    finally:
        _clear_deps()


def test_free_plan_rate_limit_below_threshold_allowed(client, override_ace_configured):
    profile = _make_profile(plan="free")
    fake = _FakeSession(recent_count=9, pending_count=0, track_count=0)
    _override_deps(profile, fake)
    try:
        with patch(
            "app.routers.generation.submit_task",
            new=AsyncMock(return_value="ace-task-x"),
        ):
            res = client.post(
                "/api/generation/jobs",
                json={"mood": "focus", "prompt": "lofi", "duration_sec": 180},
            )
            assert res.status_code == 200, res.json()
    finally:
        _clear_deps()


def test_pro_plan_no_rate_limit(client, override_ace_configured):
    profile = _make_profile(plan="pro")
    # Pro：就算 recent_count=100 也不擋（因為 endpoint 對 pro 根本不 query recent）
    fake = _FakeSession(recent_count=100, pending_count=0, track_count=0)
    _override_deps(profile, fake)
    try:
        with patch(
            "app.routers.generation.submit_task",
            new=AsyncMock(return_value="ace-task-pro"),
        ):
            res = client.post(
                "/api/generation/jobs",
                json={"mood": "focus", "prompt": "lofi", "duration_sec": 180},
            )
            assert res.status_code == 200, res.json()
            # 驗證：pro plan 沒跑 rate-limit query
            assert "recent_count" not in fake.scalar_calls, (
                f"Pro plan should skip rate-limit query; calls={fake.scalar_calls}"
            )
    finally:
        _clear_deps()


# ---- Cancel ----


def test_cancel_pending_job(client):
    profile = _make_profile(plan="free")
    job = _make_job(profile.id, status="pending")
    fake = _FakeSession(rows={job.id: job})
    _override_deps(profile, fake)
    try:
        res = client.post(f"/api/generation/jobs/{job.id}/cancel")
        assert res.status_code == 200, res.json()
        body = res.json()
        assert body["status"] == "failed"
        assert body["completed_at"] is not None
    finally:
        _clear_deps()


def test_cancel_completed_is_409(client):
    profile = _make_profile()
    job = _make_job(
        profile.id, status="completed", completed_at=datetime.now(UTC) - timedelta(minutes=5)
    )
    fake = _FakeSession(rows={job.id: job})
    _override_deps(profile, fake)
    try:
        res = client.post(f"/api/generation/jobs/{job.id}/cancel")
        assert res.status_code == 409
        assert "completed" in res.json()["detail"]
    finally:
        _clear_deps()


def test_cancel_already_failed_is_409(client):
    profile = _make_profile()
    job = _make_job(
        profile.id, status="failed", completed_at=datetime.now(UTC) - timedelta(minutes=1)
    )
    fake = _FakeSession(rows={job.id: job})
    _override_deps(profile, fake)
    try:
        res = client.post(f"/api/generation/jobs/{job.id}/cancel")
        assert res.status_code == 409
    finally:
        _clear_deps()


def test_cancel_other_user_job_is_403(client):
    profile = _make_profile()
    other_profile_id = str(uuid4())
    job = _make_job(other_profile_id, status="pending")  # 不屬於 profile
    fake = _FakeSession(rows={job.id: job})
    _override_deps(profile, fake)
    try:
        res = client.post(f"/api/generation/jobs/{job.id}/cancel")
        assert res.status_code == 403
    finally:
        _clear_deps()


def test_cancel_missing_job_is_404(client):
    profile = _make_profile()
    fake = _FakeSession(rows={})  # 空
    _override_deps(profile, fake)
    try:
        missing = "00000000-0000-0000-0000-000000000000"
        res = client.post(f"/api/generation/jobs/{missing}/cancel")
        assert res.status_code == 404
    finally:
        _clear_deps()
