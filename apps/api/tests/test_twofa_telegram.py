"""Telegram orqali 2FA va "bu qurilmani eslab qol"."""

import re

import pytest
from conftest import API, create_user, new_client
from pydantic import SecretStr

from app.core.config import settings
from app.models import Role
from app.services import telegram


@pytest.fixture
def bot(monkeypatch):
    sent: list[dict] = []

    async def fake_call(method, payload, token=None):
        if payload["chat_id"] == 404:
            raise telegram.TelegramError("Bad Request: chat not found")
        sent.append({"method": method, "token": token, **payload})
        return {"message_id": len(sent)}

    monkeypatch.setattr(settings, "twofa_bot_token", SecretStr("777:farm"))
    monkeypatch.setattr(telegram, "call", fake_call)
    return sent


def last_code(sent: list[dict]) -> str:
    return re.search(r"<code>(\d{6})</code>", sent[-1]["text"]).group(1)


async def link_telegram(client, bot, tid: int = 5550001) -> None:
    res = await client.post(f"{API}/auth/telegram/link", json={"telegram_id": tid})
    assert res.status_code == 204, res.text
    assert bot[-1]["chat_id"] == tid and bot[-1]["token"] == "777:farm"
    res = await client.post(f"{API}/auth/telegram/confirm", json={"code": last_code(bot)})
    assert res.status_code == 200, res.text
    me = res.json()
    assert me["telegram_2fa"] is True and me["totp_required"] is False
    assert "0001" not in me["telegram_hint"][:-2]


async def first_login(client, user):
    res = await client.post(f"{API}/auth/login", json={"email": user.email, "password": user.password})
    assert res.status_code == 200
    client.headers["x-csrf-token"] = client.cookies["nm_csrf"]


async def test_link_and_login_with_telegram_code(bot):
    user = await create_user(Role.admin, totp=False)
    async with new_client() as c:
        await first_login(c, user)
        # 2FA yo‘q — panel yopiq
        assert (await c.get(f"{API}/dashboard")).json()["detail"] == "totp_required"
        await link_telegram(c, bot)
        assert (await c.get(f"{API}/dashboard")).status_code == 200

    async with new_client() as c:
        body = {"email": user.email, "password": user.password}
        res = await c.post(f"{API}/auth/login", json=body)
        assert res.json() == {"requires_totp": True, "method": "telegram", "code_sent": True}
        assert "nm_access" not in c.cookies
        code = last_code(bot)

        # 30 soniya ichida qayta so‘rash — yangi xabar yo‘q
        n = len(bot)
        res = await c.post(f"{API}/auth/login", json=body)
        assert res.json()["code_sent"] is False and len(bot) == n

        bad = "000000" if code != "000000" else "111111"
        assert (await c.post(f"{API}/auth/login", json={**body, "totp": bad})).status_code == 401
        res = await c.post(f"{API}/auth/login", json={**body, "totp": code})
        assert res.status_code == 200 and res.json()["user"]["email"] == user.email
        assert "nm_trust" not in c.cookies  # remember=false

    # Kod bir martalik
    async with new_client() as c:
        res = await c.post(f"{API}/auth/login", json={**body, "totp": code})
        assert res.status_code == 401


async def test_remember_device_skips_code(bot):
    user = await create_user(Role.admin, totp=False)
    async with new_client() as c:
        await first_login(c, user)
        await link_telegram(c, bot)

    body = {"email": user.email, "password": user.password}
    async with new_client() as c:
        await c.post(f"{API}/auth/login", json=body)
        res = await c.post(f"{API}/auth/login", json={**body, "totp": last_code(bot), "remember": True})
        assert res.status_code == 200
        trust = c.cookies.get("nm_trust")
        assert trust

    # Yangi brauzer seansi, lekin trust cookie bor → kod so‘ralmaydi
    async with new_client() as c:
        c.cookies.set("nm_trust", trust)
        n = len(bot)
        res = await c.post(f"{API}/auth/login", json=body)
        assert res.status_code == 200 and res.json()["user"]["email"] == user.email
        assert len(bot) == n
        # Parol baribir kerak
        c2 = new_client()
        c2.cookies.set("nm_trust", trust)
        assert (await c2.post(f"{API}/auth/login", json={**body, "password": "wrong-password-123"})).status_code == 401
        await c2.aclose()

        # Parol almashsa — eslab qolish bekor
        c.headers["x-csrf-token"] = c.cookies["nm_csrf"]
        res = await c.post(f"{API}/auth/password", json={"current": user.password, "new": "Another-Strong-Pass-77"})
        assert res.status_code == 204

    async with new_client() as c:
        c.cookies.set("nm_trust", trust)
        res = await c.post(f"{API}/auth/login", json={**body, "password": "Another-Strong-Pass-77"})
        assert res.json().get("requires_totp") is True


async def test_trust_cookie_of_other_user_ignored(bot):
    a = await create_user(Role.admin, totp=False)
    b = await create_user(Role.admin, totp=False)
    for u, tid in ((a, 5550001), (b, 5550002)):
        async with new_client() as c:
            await first_login(c, u)
            await link_telegram(c, bot, tid)
    async with new_client() as c:
        body = {"email": a.email, "password": a.password}
        await c.post(f"{API}/auth/login", json=body)
        await c.post(f"{API}/auth/login", json={**body, "totp": last_code(bot), "remember": True})
        trust = c.cookies["nm_trust"]
    async with new_client() as c:
        c.cookies.set("nm_trust", trust)
        res = await c.post(f"{API}/auth/login", json={"email": b.email, "password": b.password})
        assert res.json().get("requires_totp") is True


async def test_link_errors(bot, monkeypatch):
    user = await create_user(Role.admin, totp=False)
    async with new_client() as c:
        await first_login(c, user)
        res = await c.post(f"{API}/auth/telegram/link", json={"telegram_id": 404})
        assert res.status_code == 400 and res.json()["detail"] == "telegram_unreachable"
        # kodsiz confirm
        res = await c.post(f"{API}/auth/telegram/confirm", json={"code": "123456"})
        assert res.json()["detail"] == "invalid_code"
        # 5 xato urinishdan keyin kod o‘chadi
        await c.post(f"{API}/auth/telegram/link", json={"telegram_id": 5550009})
        good = last_code(bot)
        bad = "000000" if good != "000000" else "111111"
        for _ in range(5):
            await c.post(f"{API}/auth/telegram/confirm", json={"code": bad})
        res = await c.post(f"{API}/auth/telegram/confirm", json={"code": good})
        assert res.json()["detail"] == "invalid_code"
        # CSRF'siz link — 403
        del c.headers["x-csrf-token"]
        assert (await c.post(f"{API}/auth/telegram/link", json={"telegram_id": 1})).status_code == 403

    monkeypatch.setattr(settings, "twofa_bot_token", None)
    monkeypatch.setattr(settings, "telegram_bot_token", None)
    async with new_client() as c:
        await first_login(c, user)
        res = await c.post(f"{API}/auth/telegram/link", json={"telegram_id": 5550001})
        assert res.status_code == 503 and res.json()["detail"] == "telegram_not_configured"


async def test_totp_app_fallback_when_telegram_down(bot, monkeypatch):
    """Ilova ham yoqilgan bo‘lsa va Telegram ishlamasa — ilova kodi so‘raladi."""
    user = await create_user(Role.admin, totp=True)
    async with new_client() as c:
        from conftest import login

        await login(c, user)
        await link_telegram(c, bot)

    async def down(*a, **k):
        raise RuntimeError("network")

    monkeypatch.setattr(telegram, "call", down)
    async with new_client() as c:
        res = await c.post(f"{API}/auth/login", json={"email": user.email, "password": user.password})
        assert res.json() == {"requires_totp": True, "method": "app"}
