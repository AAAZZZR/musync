"""Generation endpoint tests — mock mode（ACE_API_BASE_URL 未設定時直接回 completed）。"""


def test_create_generation_job_mock_mode(auth_client):
    """沒設 ACE_API_BASE_URL 時走 mock，直接回 completed + track。"""
    res = auth_client.post(
        "/api/generation/jobs",
        json={
            "mood": "focus",
            "prompt": "lofi piano",
            "duration_sec": 180,
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["mood"] == "focus"
    assert body["status"] == "completed"
    assert body["track"] is not None
    assert body["track"]["source"] == "ace-1.5"


def test_get_job(auth_client):
    """建立後可以用 job_id 查到。"""
    create_res = auth_client.post(
        "/api/generation/jobs",
        json={"mood": "calm", "prompt": "ambient", "duration_sec": 120},
    )
    job_id = create_res.json()["job_id"]

    get_res = auth_client.get(f"/api/generation/jobs/{job_id}")
    assert get_res.status_code == 200
    assert get_res.json()["job_id"] == job_id


def test_list_generation_jobs(auth_client):
    auth_client.post(
        "/api/generation/jobs",
        json={"mood": "focus", "prompt": "test", "duration_sec": 180},
    )
    auth_client.post(
        "/api/generation/jobs",
        json={"mood": "calm", "prompt": "test2", "duration_sec": 60},
    )
    res = auth_client.get("/api/generation/jobs")
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_unauthenticated_request_rejected(client):
    res = client.post(
        "/api/generation/jobs",
        json={"mood": "focus", "prompt": "test", "duration_sec": 180},
    )
    assert res.status_code == 401


def test_unsupported_mood_rejected(auth_client):
    res = auth_client.post(
        "/api/generation/jobs",
        json={"mood": "invalid_mood", "prompt": "test", "duration_sec": 180},
    )
    assert res.status_code == 400


def test_other_user_cannot_see_job(auth_client):
    """建立的 job 用不同 user 查不到。"""
    from app.dependencies import get_current_user_id
    from app.main import app

    create_res = auth_client.post(
        "/api/generation/jobs",
        json={"mood": "focus", "prompt": "mine", "duration_sec": 180},
    )
    job_id = create_res.json()["job_id"]

    # 切到另一個 user
    app.dependency_overrides[get_current_user_id] = lambda: "other-user-id"
    get_res = auth_client.get(f"/api/generation/jobs/{job_id}")
    assert get_res.status_code == 404
