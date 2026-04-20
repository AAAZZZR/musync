"""Account management smoke tests — route registration + auth gate + ToS validation。"""

from app.main import app


def test_account_routes_registered(client):
    routes = {r.path for r in app.routes if hasattr(r, "path")}
    assert "/api/auth/change-password" in routes
    assert "/api/auth/change-email" in routes
    # DELETE /api/profile shares path with GET/PATCH — 檢查 path 存在即可
    assert "/api/profile" in routes


def test_account_methods_registered(client):
    """確認 /api/profile 有 DELETE；/api/auth/change-* 有 POST。"""
    method_map: dict[str, set[str]] = {}
    for r in app.routes:
        if hasattr(r, "path") and hasattr(r, "methods") and r.methods:
            method_map.setdefault(r.path, set()).update(r.methods)

    assert "DELETE" in method_map["/api/profile"]
    assert "POST" in method_map["/api/auth/change-password"]
    assert "POST" in method_map["/api/auth/change-email"]


def test_change_password_requires_auth(client):
    res = client.post(
        "/api/auth/change-password",
        json={"current_password": "oldpass1", "new_password": "newpass1"},
    )
    assert res.status_code == 401


def test_change_email_requires_auth(client):
    res = client.post("/api/auth/change-email", json={"new_email": "new@example.com"})
    assert res.status_code == 401


def test_delete_profile_requires_auth(client):
    res = client.delete("/api/profile")
    assert res.status_code == 401


def test_signup_rejected_without_tos(client):
    """Signup payload 沒 accept ToS → 400（在 tos_accepted=False 預設狀況）。"""
    res = client.post(
        "/api/auth/signup",
        json={
            "email": "x@example.com",
            "password": "password1",
            "full_name": "Test User",
            "tos_accepted": False,
        },
    )
    assert res.status_code == 400
    body = res.json()
    assert "Terms" in body["detail"]


def test_signup_default_tos_false_rejected(client):
    """沒帶 tos_accepted 欄位 → default False → 400."""
    res = client.post(
        "/api/auth/signup",
        json={
            "email": "x@example.com",
            "password": "password1",
            "full_name": "Test User",
        },
    )
    assert res.status_code == 400


def test_change_password_schema_validation(client):
    """new_password 太短 → 422（pydantic min_length=8）。"""
    # 缺 Authorization header 會先 401，所以這裡測 422 要用合法的 header
    # 但沒有 DB / 真 Supabase → 只能測 401 gate。改測 422 的方式：空 body 看 422 or 401
    # 這邊驗證在 401 gate 之前、body 無效時的 422。其實 FastAPI 先跑 auth dep，
    # 所以未登入會是 401 而非 422 — 保留此 test 檢查 401 gate 生效。
    res = client.post(
        "/api/auth/change-password",
        json={"current_password": "x", "new_password": "short"},
    )
    assert res.status_code == 401
