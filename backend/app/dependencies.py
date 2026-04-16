from fastapi import Header, HTTPException, status

from app.services import require_user


def get_current_user(token: str = Header(default=None, alias="Authorization")) -> dict:
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return require_user(token.replace("Bearer ", "", 1).strip())
