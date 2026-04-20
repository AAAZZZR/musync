from datetime import UTC, datetime

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.db import get_session
from app.jwks import get_key
from app.models import Profile
from app.schemas import AuthUser


async def get_current_auth_user(
    authorization: str = Header(default=None, alias="Authorization"),
) -> AuthUser:
    """驗證 Supabase ES256 JWT，回 AuthUser（sub + email + full_name）。"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = authorization.replace("Bearer ", "", 1).strip()

    try:
        headers = jwt.get_unverified_headers(token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token")

    kid = headers.get("kid")
    if not kid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing kid")

    jwk = await get_key(kid)
    if not jwk:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown signing key")

    try:
        payload = jwt.decode(
            token,
            jwk,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    email = payload.get("email", "")
    metadata = payload.get("user_metadata") or {}
    full_name = metadata.get("full_name") or (email.split("@")[0] if email else "User")
    tos_accepted = bool(metadata.get("tos_accepted"))

    return AuthUser(id=user_id, email=email, full_name=full_name, tos_accepted=tos_accepted)


async def get_current_profile(
    auth: AuthUser = Depends(get_current_auth_user),
    session: AsyncSession = Depends(get_session),
) -> Profile:
    """依 JWT 取 Profile，不存在則自動建立（等同 frontend 的 requireProfile）。"""
    stmt = select(Profile).where(Profile.user_id == auth.id)
    profile = await session.scalar(stmt)
    if profile:
        return profile

    profile = Profile(user_id=auth.id, email=auth.email, full_name=auth.full_name)
    # 來自 email/password signup 時 JWT user_metadata.tos_accepted=true → 立即記錄時間
    if auth.tos_accepted:
        profile.tos_accepted_at = datetime.now(UTC)
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return profile


async def get_optional_auth_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> AuthUser | None:
    """未帶 token 回 None；token 無效也回 None（不 raise）。"""
    if not authorization:
        return None
    try:
        return await get_current_auth_user(authorization)
    except HTTPException:
        return None


# Backwards-compat alias — 仍允許只要 id 的 endpoints 用
async def get_current_user_id(auth: AuthUser = Depends(get_current_auth_user)) -> str:
    return auth.id
