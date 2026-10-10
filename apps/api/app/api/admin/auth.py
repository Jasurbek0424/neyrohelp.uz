"""Autentifikatsiya: login (+TOTP), refresh rotatsiyasi, logout, me, 2FA, parol almashtirish."""

import asyncio
import logging
import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import CurrentUser, SessionDep, totp_required
from app.core.ratelimit import client_ip, enforce
from app.core.redis import redis
from app.core.security import (
    ACCESS_COOKIE,
    CSRF_COOKIE,
    CSRF_HEADER,
    REFRESH_COOKIE,
    create_access_token,
    csrf_valid,
    decode_access_token,
    hash_password,
    needs_rehash,
    new_csrf_token,
    new_opaque_token,
    new_totp_secret,
    sha256,
    totp_uri,
    verify_password,
    verify_totp,
)
from app.models import RefreshToken, User
from app.schemas.admin import (
    LoginIn,
    LoginOut,
    Me,
    PasswordIn,
    TotpEnableIn,
    TotpSetupOut,
    UserEnvelope,
)
from app.services.passwords import password_problem

from ._common import audit, invalid

log = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["admin:auth"])

REFRESH_PATH = "/api/v1/admin/auth"
LOGIN_WINDOW = 15 * 60
LOGIN_IP_LIMIT = 10
LOGIN_EMAIL_LIMIT = 10
MAX_FAILS = 5
LOCK_FOR = timedelta(minutes=15)

# argon2id 64 MB xotira oladi — kichik VPS'da parallel hisoblashlar soni cheklanadi
_hash_slots = asyncio.Semaphore(2)


async def _verify(password: str, hashed: str | None) -> bool:
    async with _hash_slots:
        return await run_in_threadpool(verify_password, password, hashed)


async def _hash(password: str) -> str:
    async with _hash_slots:
        return await run_in_threadpool(hash_password, password)


def me_out(user: User) -> Me:
    return Me(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        totp_enabled=user.totp_enabled,
        totp_required=totp_required(user),
    )


# ───────────────────────── Origin tekshiruvi (login CSRF) ─────────────────────────


def _origin(url: str | None) -> str | None:
    if not url:
        return None
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.netloc:
        return None
    return f"{parts.scheme}://{parts.netloc}".lower()


def _allowed_origins() -> set[str]:
    return {o for o in (_origin(u) for u in [*settings.cors_origins, settings.site_url]) if o}


def check_origin(request: Request) -> None:
    """login/refresh'da X-CSRF-Token yo‘q, shuning uchun Origin (bo‘lmasa Referer) majburiy va ruxsat etilgan bo‘lishi shart."""
    origin = request.headers.get("origin")
    source = _origin(origin) if origin else _origin(request.headers.get("referer"))
    if not source or source not in _allowed_origins():
        raise HTTPException(status.HTTP_403_FORBIDDEN, "csrf_failed")


# ───────────────────────── Cookie'lar ─────────────────────────


def _cookie_kwargs() -> dict:
    return {"secure": settings.cookie_secure, "samesite": "strict", "domain": settings.cookie_domain}


def set_session_cookies(response: Response, access: str, refresh: str, csrf: str) -> None:
    refresh_age = settings.refresh_ttl_days * 86400
    kw = _cookie_kwargs()
    response.set_cookie(ACCESS_COOKIE, access, max_age=settings.access_ttl_minutes * 60, path="/", httponly=True, **kw)
    response.set_cookie(REFRESH_COOKIE, refresh, max_age=refresh_age, path=REFRESH_PATH, httponly=True, **kw)
    # nm_csrf JS o‘qiydi (double-submit) — HttpOnly emas
    response.set_cookie(CSRF_COOKIE, csrf, max_age=refresh_age, path="/", httponly=False, **kw)


def clear_session_cookies(response: Response) -> None:
    kw = _cookie_kwargs()
    response.delete_cookie(ACCESS_COOKIE, path="/", httponly=True, **kw)
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_PATH, httponly=True, **kw)
    response.delete_cookie(CSRF_COOKIE, path="/", httponly=False, **kw)


def _unauthorized() -> JSONResponse:
    res = JSONResponse({"detail": "not_authenticated"}, status_code=status.HTTP_401_UNAUTHORIZED)
    clear_session_cookies(res)
    return res


def issue_session(session: AsyncSession, request: Request, response: Response, user: User, family: uuid.UUID | None = None) -> None:
    token, token_hash = new_opaque_token()
    session.add(
        RefreshToken(
            family=family or uuid.uuid4(),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_ttl_days),
            user_agent=(request.headers.get("user-agent") or "")[:255] or None,
        )
    )
    access = create_access_token(user.id, user.role.value, user.token_version)
    set_session_cookies(response, access, token, new_csrf_token())


async def revoke_user_tokens(session: AsyncSession, user_id: int) -> None:
    await session.execute(
        update(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False)).values(revoked=True)
    )


async def _totp_fresh(user_id: int, code: str) -> bool:
    """Bir TOTP kodini ikki marta ishlatib bo‘lmaydi (replay). Redis ishlamasa — ruxsat."""
    try:
        return bool(await redis.set(f"totp:used:{user_id}:{code}", "1", nx=True, ex=120))
    except Exception:
        log.warning("redis totp replay check failed", exc_info=True)
        return True


async def _ghost_failures(email_key: str) -> int:
    """Mavjud bo‘lmagan email uchun ham bloklashni taqlid qilamiz — javoblar farqlanmasin."""
    key = f"login:ghost:{email_key}"
    try:
        pipe = redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, int(LOCK_FOR.total_seconds()), nx=True)
        count, _ = await pipe.execute()
        return int(count)
    except Exception:  # noqa: BLE001
        return 0


def _invalid_credentials() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid_credentials")


def _locked() -> HTTPException:
    return HTTPException(status.HTTP_423_LOCKED, "locked")


# ───────────────────────── Endpointlar ─────────────────────────


@router.post("/login", response_model=LoginOut, response_model_exclude_none=True)
async def login(body: LoginIn, request: Request, response: Response, session: SessionDep):
    check_origin(request)
    ip = client_ip(request)
    email_key = sha256(body.email)[:32]
    await enforce(f"login:ip:{ip}", LOGIN_IP_LIMIT, LOGIN_WINDOW)
    await enforce(f"login:email:{email_key}", LOGIN_EMAIL_LIMIT, LOGIN_WINDOW)

    user = await session.scalar(select(User).where(func.lower(User.email) == body.email).with_for_update())
    usable = user is not None and user.is_active
    now = datetime.now(UTC)
    # Parol har doim tekshiriladi (foydalanuvchi bo‘lmasa — dummy hash): javob vaqti bir xil
    ok = await _verify(body.password, user.password_hash if usable else None)

    if not usable:
        fails = await _ghost_failures(email_key)
        audit(session, request, None, "login_failed", "user", meta={"reason": "invalid_credentials"})
        await session.commit()
        raise _locked() if fails > MAX_FAILS else _invalid_credentials()

    if user is None:  # tip toraytirish (usable=True bo‘lsa user bor)
        raise _invalid_credentials()
    if user.locked_until and user.locked_until > now:
        audit(session, request, user, "login_failed", "user", user.id, {"reason": "locked"})
        await session.commit()
        raise _locked()

    async def fail(reason: str) -> HTTPException:
        user.failed_logins = (user.failed_logins or 0) + 1
        meta: dict = {"reason": reason}
        if user.failed_logins >= MAX_FAILS:
            user.locked_until = now + LOCK_FOR
            user.failed_logins = 0
            meta["locked"] = True
        audit(session, request, user, "login_failed", "user", user.id, meta)
        await session.commit()
        return _invalid_credentials()

    if not ok:
        raise await fail("invalid_credentials")

    if user.totp_enabled:
        if not body.totp:
            await session.commit()
            return LoginOut(requires_totp=True)
        if not verify_totp(user.totp_secret, body.totp) or not await _totp_fresh(user.id, body.totp):
            raise await fail("invalid_totp")

    user.failed_logins = 0
    user.locked_until = None
    user.last_login_at = now
    if needs_rehash(user.password_hash):
        user.password_hash = await _hash(body.password)
    issue_session(session, request, response, user)
    audit(session, request, user, "login_success", "user", user.id)
    await session.commit()
    return LoginOut(user=me_out(user))


@router.post("/refresh", response_model=UserEnvelope)
async def refresh(request: Request, response: Response, session: SessionDep):
    check_origin(request)
    await enforce(f"refresh:ip:{client_ip(request)}", 60, 60)
    raw = request.cookies.get(REFRESH_COOKIE)
    if not raw or len(raw) > 128:
        return _unauthorized()

    row = await session.scalar(select(RefreshToken).where(RefreshToken.token_hash == sha256(raw)).with_for_update())
    now = datetime.now(UTC)
    if not row or row.revoked:
        return _unauthorized()
    if row.used_at is not None:
        # Ishlatilgan token qayta keldi → o‘g‘irlangan bo‘lishi mumkin: butun oila bekor
        await session.execute(update(RefreshToken).where(RefreshToken.family == row.family).values(revoked=True))
        user = await session.get(User, row.user_id)
        audit(session, request, user, "refresh_reuse", "user", row.user_id, {"family": str(row.family)})
        await session.commit()
        log.warning("refresh token reuse detected for user %s", row.user_id)
        return _unauthorized()
    if row.expires_at <= now:
        return _unauthorized()

    user = await session.get(User, row.user_id)
    if not user or not user.is_active:
        row.revoked = True
        await session.commit()
        return _unauthorized()

    row.used_at = now
    issue_session(session, request, response, user, family=row.family)
    await session.commit()
    return UserEnvelope(user=me_out(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, session: SessionDep):
    if not csrf_valid(request.cookies.get(CSRF_COOKIE), request.headers.get(CSRF_HEADER)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "csrf_failed")

    user: User | None = None
    token = request.cookies.get(ACCESS_COOKIE)
    data = decode_access_token(token) if token else None
    if data:
        user = await session.get(User, int(data["sub"]))

    raw = request.cookies.get(REFRESH_COOKIE)
    if raw and len(raw) <= 128:
        row = await session.scalar(select(RefreshToken).where(RefreshToken.token_hash == sha256(raw)))
        if row:
            await session.execute(update(RefreshToken).where(RefreshToken.family == row.family).values(revoked=True))
            if user is None:
                user = await session.get(User, row.user_id)
    if user:
        audit(session, request, user, "logout", "user", user.id)
    await session.commit()

    res = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookies(res)
    return res


@router.get("/me", response_model=Me)
async def me(user: CurrentUser):
    return me_out(user)


@router.post("/totp/setup", response_model=TotpSetupOut)
async def totp_setup(request: Request, user: CurrentUser, session: SessionDep):
    if user.totp_enabled:
        raise HTTPException(status.HTTP_409_CONFLICT, "totp_already_enabled")
    secret = new_totp_secret()
    user.totp_secret = secret
    audit(session, request, user, "totp_setup", "user", user.id)
    await session.commit()
    return TotpSetupOut(secret=secret, otpauth_uri=totp_uri(secret, user.email))


@router.post("/totp/enable", response_model=Me)
async def totp_enable(body: TotpEnableIn, request: Request, user: CurrentUser, session: SessionDep):
    await enforce(f"totp:enable:{user.id}", 10, LOGIN_WINDOW)
    if user.totp_enabled:
        raise HTTPException(status.HTTP_409_CONFLICT, "totp_already_enabled")
    if not user.totp_secret:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "totp_not_setup")
    if not verify_totp(user.totp_secret, body.code) or not await _totp_fresh(user.id, body.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid_code")
    user.totp_enabled = True
    audit(session, request, user, "totp_enabled", "user", user.id)
    await session.commit()
    return me_out(user)


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(body: PasswordIn, request: Request, user: CurrentUser, session: SessionDep):
    await enforce(f"password:{user.id}", 10, LOGIN_WINDOW)
    if not await _verify(body.current, user.password_hash):
        audit(session, request, user, "password_change_failed", "user", user.id)
        await session.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid_password")
    problem = password_problem(body.new, user.email)
    if problem:
        raise invalid("new", problem)

    user.password_hash = await _hash(body.new)
    user.token_version += 1  # barcha access tokenlar yaroqsiz
    await revoke_user_tokens(session, user.id)
    audit(session, request, user, "password_changed", "user", user.id)
    await session.commit()

    res = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookies(res)
    return res
