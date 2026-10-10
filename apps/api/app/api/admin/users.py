"""Foydalanuvchilar (faqat admin)."""

from fastapi import APIRouter, Request, Response, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select

from app.core.deps import AdminOnly, SessionDep
from app.core.security import hash_password
from app.models import User
from app.schemas.admin import UserIn, UserOut, UserPatch
from app.services.passwords import password_problem

from ._common import audit, conflict, invalid, not_found, patch_data
from .auth import revoke_user_tokens

router = APIRouter(prefix="/users", tags=["admin:system"])


@router.get("", response_model=list[UserOut])
async def list_users(user: AdminOnly, session: SessionDep):
    rows = (await session.scalars(select(User).order_by(User.id))).all()
    return [UserOut.model_validate(u) for u in rows]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(body: UserIn, request: Request, user: AdminOnly, session: SessionDep):
    email = body.email.strip().lower()
    if await session.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise conflict("email_taken")
    problem = password_problem(body.password, email)
    if problem:
        raise invalid("password", problem)
    new = User(
        email=email,
        name=body.name,
        role=body.role,
        password_hash=await run_in_threadpool(hash_password, body.password),
        is_active=True,
        totp_enabled=False,
        failed_logins=0,
        token_version=0,
    )
    session.add(new)
    await session.flush()
    audit(session, request, user, "user_create", "user", new.id, {"role": body.role.value})
    await session.commit()
    await session.refresh(new)
    return UserOut.model_validate(new)


@router.patch("/{user_id}", response_model=UserOut)
async def patch_user(user_id: int, body: UserPatch, request: Request, user: AdminOnly, session: SessionDep):
    target = await session.get(User, user_id, with_for_update=True)
    if not target:
        raise not_found()
    data = patch_data(body)
    if target.id == user.id and (("role" in data and data["role"] != target.role) or data.get("is_active") is False):
        # O‘zini adminlikdan tushirib/bloklab, tizimni boshqaruvsiz qoldirmaslik uchun
        raise conflict("cannot_modify_self")

    meta: dict = {}
    if "name" in data and data["name"] != target.name:
        meta["name"] = True
        target.name = data["name"]
    revoke = False
    if "role" in data and data["role"] != target.role:
        meta["role"] = {"old": target.role.value, "new": data["role"].value}
        target.role = data["role"]
        revoke = True
    if "is_active" in data and data["is_active"] != target.is_active:
        meta["is_active"] = data["is_active"]
        target.is_active = data["is_active"]
        revoke = True
    if revoke:
        # Rol yoki faollik o‘zgarsa — barcha sessiyalar bekor
        target.token_version += 1
        await revoke_user_tokens(session, target.id)
    if meta:
        audit(session, request, user, "role_change" if "role" in meta else "user_update", "user", target.id, meta)
    await session.commit()
    await session.refresh(target)
    return UserOut.model_validate(target)


@router.post("/{user_id}/revoke-sessions", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_sessions(user_id: int, request: Request, user: AdminOnly, session: SessionDep):
    target = await session.get(User, user_id, with_for_update=True)
    if not target:
        raise not_found()
    target.token_version += 1
    await revoke_user_tokens(session, target.id)
    audit(session, request, user, "sessions_revoked", "user", target.id)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
