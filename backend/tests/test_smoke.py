"""Smoke tests — app import + critical routes registered."""


def test_app_imports():
    from app.main import app

    assert app.title == "MuSync API"


def test_routes_registered(client):
    routes = {r.path for r in client.app.routes if hasattr(r, "path")}
    assert "/api/auth/login" in routes
    assert "/api/auth/signup" in routes
    assert "/api/auth/refresh" in routes
    assert "/api/auth/logout" in routes
    assert "/api/tracks" in routes
    assert "/api/community/tracks" in routes
    assert "/api/generation/jobs" in routes
    assert "/api/stream/seed/{seed_id}" in routes
    assert "/api/stream/track/{track_id}" in routes
    assert "/api/billing/checkout" in routes
    assert "/api/billing/webhook" in routes


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200


def test_moods(client):
    res = client.get("/api/catalog/moods")
    assert res.status_code == 200
    body = res.json()
    assert any(m["key"] == "focus" for m in body)


def test_unauthed_tracks_rejected(client):
    res = client.get("/api/tracks")
    assert res.status_code == 401
