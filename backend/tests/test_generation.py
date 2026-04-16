def test_create_generation_job(auth_client):
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


def test_list_generation_jobs(auth_client):
    auth_client.post(
        "/api/generation/jobs",
        json={"mood": "focus", "prompt": "test", "duration_sec": 180},
    )
    res = auth_client.get("/api/generation/jobs")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_unauthenticated_request_rejected(client):
    res = client.post(
        "/api/generation/jobs",
        json={"mood": "focus", "prompt": "test", "duration_sec": 180},
    )
    assert res.status_code == 401
