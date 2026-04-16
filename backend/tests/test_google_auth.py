from unittest.mock import patch


def test_google_auth_creates_new_user(client):
    with patch("app.routers.auth.id_token_module.verify_oauth2_token") as verify:
        verify.return_value = {
            "email": "rudy@example.com",
            "email_verified": True,
            "name": "Rudy",
        }
        res = client.post("/api/auth/google", json={"id_token": "fake-id-token-long-enough"})

    assert res.status_code == 200
    body = res.json()
    assert body["user"]["email"] == "rudy@example.com"
    assert body["access_token"].startswith("msk_")


def test_google_auth_returns_existing_user(client):
    with patch("app.routers.auth.id_token_module.verify_oauth2_token") as verify:
        verify.return_value = {
            "email": "rudy@example.com",
            "email_verified": True,
            "name": "Rudy",
        }
        first = client.post("/api/auth/google", json={"id_token": "tok1-long-enough"})
        second = client.post("/api/auth/google", json={"id_token": "tok2-long-enough"})

    assert first.json()["user"]["id"] == second.json()["user"]["id"]


def test_google_auth_rejects_unverified_email(client):
    with patch("app.routers.auth.id_token_module.verify_oauth2_token") as verify:
        verify.return_value = {"email": "rudy@example.com", "email_verified": False}
        res = client.post("/api/auth/google", json={"id_token": "tok-long-enough"})
    assert res.status_code == 401


def test_google_auth_rejects_invalid_token(client):
    with patch("app.routers.auth.id_token_module.verify_oauth2_token") as verify:
        verify.side_effect = ValueError("bad sig")
        res = client.post("/api/auth/google", json={"id_token": "tok-long-enough"})
    assert res.status_code == 401
