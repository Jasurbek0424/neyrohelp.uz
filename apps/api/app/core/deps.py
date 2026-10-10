from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Role, User

from .db import get_session
from .ratelimit import enforce
from .security import ACCESS_COOKIE, CSRF_COOKIE, CSRF_HEADER, csrf_valid, decode_access_token

SessionDep = Annotated[AsyncSession, Depends(get_session)]

UNSAFE = {"POST", "PUT", "PATCH", "DELETE"}


async def current_user(request: Request, session: SessionDep) -> User:
    token = request.cookies.get(ACCESS_COOKIE)
    data = decode_access_token(token) if token else None
    if not data:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "not_authenticated")
    user = await session.get(User, int(data["sub"]))
    # token_version: rol/parol o‘zgarsa yoki "hamma joydan chiqish" bosilsa eski tokenlar ishlamaydi
    if not user or not user.is_active or user.token_version != data.get("ver"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "not_authenticated")

    # CSRF: cookie + header double-submit (SameSite=Strict bilan birga)
    if request.method in UNSAFE and not csrf_valid(request.cookies.get(CSRF_COOKIE), request.headers.get(CSRF_HEADER)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "csrf_failed")

    await enforce(f"admin:{user.id}", limit=600, window_seconds=60)
    request.state.user = user
    return user


CurrentUser = Annotated[User, Depends(current_user)]


TOTP_ROLES = {Role.admin, Role.editor}


def totp_required(user: User) -> bool:
    """Administrator va muharrir uchun 2FA majburiy (ARCHITECTURE.md → Xavfsizlik)."""
    return user.role in TOTP_ROLES and not user.totp_enabled


def require_role(*roles: Role) -> Callable:
    """Default deny: ro‘yxatda bo‘lmagan rol — 403. admin/editor 2FA'siz faqat /auth endpointlariga kira oladi."""

    async def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
        if totp_required(user):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "totp_required")
        return user

    return checker


AdminOnly = Annotated[User, Depends(require_role(Role.admin))]
ContentEditor = Annotated[User, Depends(require_role(Role.admin, Role.editor))]
LeadOperator = Annotated[User, Depends(require_role(Role.admin, Role.operator))]
AnyStaff = Annotated[User, Depends(require_role(Role.admin, Role.editor, Role.operator))]
