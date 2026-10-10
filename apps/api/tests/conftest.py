"""Test muhiti: neyromed_test bazasi, Redis db 15, vaqtinchalik media papka.

Muhit o‘zgaruvchilari app import qilinishidan OLDIN o‘rnatiladi (settings lru_cache).
"""

import os
import tempfile

_MEDIA = tempfile.mkdtemp(prefix="neyromed-media-")
os.environ.update(
    {
        "ENV": "test",
        "DATABASE_URL": "postgresql+asyncpg://neyromed:neyromed@127.0.0.1:5432/neyromed_test",
        "REDIS_URL": "redis://127.0.0.1:6379/15",
        "MEDIA_DIR": _MEDIA,
        "COOKIE_SECURE": "false",
        "TWOFA_ENABLED": "true",
    }
)
for _k in ("TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "TELEGRAM_WEBHOOK_SECRET"):
    os.environ.pop(_k, None)

import itertools
import shutil
from collections.abc import AsyncIterator
from dataclasses import dataclass

import httpx
import pyotp
import pytest
from sqlalchemy import delete

from app.core.config import settings
from app.core.db import Base, SessionLocal, engine
from app.core.redis import redis
from app.core.security import hash_password
from app.main import app
from app.models import Role, User

assert settings.env == "test"
assert settings.database_url.endswith("/neyromed_test")

ORIGIN = "http://localhost:3000"
API = "/api/v1/admin"
PASSWORD = "Correct-Horse-Battery-9"
_emails = itertools.count(1)


@pytest.fixture(scope="session", autouse=True)
async def _schema() -> AsyncIterator[None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await redis.flushdb()
    await engine.dispose()
    shutil.rmtree(_MEDIA, ignore_errors=True)


@pytest.fixture(autouse=True)
async def _clean(_schema) -> AsyncIterator[None]:
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(delete(table))
    await redis.flushdb()
    yield


def new_client(**headers: str) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
        headers={"origin": ORIGIN, **headers},
    )


@pytest.fixture
async def client() -> AsyncIterator[httpx.AsyncClient]:
    async with new_client() as c:
        yield c


@dataclass
class TUser:
    id: int
    email: str
    name: str
    role: Role
    password: str
    totp_secret: str | None


async def create_user(role: Role = Role.admin, *, totp: bool = True, password: str = PASSWORD, active: bool = True) -> TUser:
    secret = pyotp.random_base32() if totp else None
    n = next(_emails)
    email = f"{role.value}{n}@neyromed.test"
    async with SessionLocal() as s:
        u = User(
            email=email,
            name=f"{role.value.title()} {n}",
            password_hash=hash_password(password),
            role=role,
            is_active=active,
            totp_secret=secret,
            totp_enabled=bool(secret),
            failed_logins=0,
            token_version=0,
        )
        s.add(u)
        await s.commit()
        return TUser(u.id, email, u.name, role, password, secret)


def totp_now(secret: str) -> str:
    return pyotp.TOTP(secret).now()


async def login(client: httpx.AsyncClient, user: TUser) -> httpx.Response:
    """To‘liq login (+TOTP) va X-CSRF-Token headerini o‘rnatish."""
    body = {"email": user.email, "password": user.password}
    if user.totp_secret:
        body["totp"] = totp_now(user.totp_secret)
    res = await client.post(f"{API}/auth/login", json=body)
    assert res.status_code == 200, res.text
    if user.totp_secret:
        # Testlarda bir xil kodni qayta ishlatish mumkin bo‘lsin (replay himoyasi alohida test qilinadi)
        await redis.delete(f"totp:used:{user.id}:{body['totp']}")
    client.headers["x-csrf-token"] = client.cookies["nm_csrf"]
    return res


@pytest.fixture
async def admin_client() -> AsyncIterator[tuple[httpx.AsyncClient, TUser]]:
    user = await create_user(Role.admin)
    async with new_client() as c:
        await login(c, user)
        yield c, user


@pytest.fixture
async def editor_client() -> AsyncIterator[tuple[httpx.AsyncClient, TUser]]:
    user = await create_user(Role.editor)
    async with new_client() as c:
        await login(c, user)
        yield c, user


@pytest.fixture
async def operator_client() -> AsyncIterator[tuple[httpx.AsyncClient, TUser]]:
    user = await create_user(Role.operator, totp=False)
    async with new_client() as c:
        await login(c, user)
        yield c, user
