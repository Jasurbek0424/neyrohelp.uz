from datetime import UTC, datetime

import pyotp
from conftest import API, ORIGIN, PASSWORD, create_user, login, new_client, totp_now
from sqlalchemy import select

from app.core.db import SessionLocal
from app.models import AuditLog, RefreshToken, Role, User


async def _audit_actions() -> list[str]:
    async with SessionLocal() as s:
        return list((await s.scalars(select(AuditLog.action).order_by(AuditLog.id))).all())


# ───────────────────────── Login ─────────────────────────


async def test_login_success_sets_secure_cookies(client):
    u = await create_user(Role.admin)
    res = await login(client, u)
    body = res.json()
    assert body["user"] == {
        "id": u.id,
        "email": u.email,
        "name": u.name,
        "role": "admin",
        "totp_enabled": True,
        "totp_required": False,
    }
    cookies = {c.split("=", 1)[0]: c.lower() for c in res.headers.get_list("set-cookie")}
    assert "httponly" in cookies["nm_access"] and "path=/;" in cookies["nm_access"] + ";"
    assert "httponly" in cookies["nm_refresh"] and "path=/api/v1/admin/auth" in cookies["nm_refresh"]
    assert "httponly" not in cookies["nm_csrf"]
    assert all("samesite=strict" in v for v in cookies.values())
    assert "login_success" in await _audit_actions()


async def test_login_email_case_insensitive(client):
    u = await create_user(Role.operator, totp=False)
    res = await client.post(f"{API}/auth/login", json={"email": u.email.upper(), "password": PASSWORD})
    assert res.status_code == 200


async def test_login_wrong_password_and_unknown_email_same_response(client):
    u = await create_user(Role.operator, totp=False)
    wrong = await client.post(f"{API}/auth/login", json={"email": u.email, "password": "nope-nope-nope"})
    unknown = await client.post(f"{API}/auth/login", json={"email": "ghost@neyromed.test", "password": "nope-nope-nope"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"detail": "invalid_credentials"}
    assert "set-cookie" not in wrong.headers
    assert (await _audit_actions()).count("login_failed") == 2


async def test_inactive_user_gets_invalid_credentials(client):
    u = await create_user(Role.operator, totp=False, active=False)
    res = await client.post(f"{API}/auth/login", json={"email": u.email, "password": PASSWORD})
    assert res.status_code == 401
    assert res.json()["detail"] == "invalid_credentials"


async def test_lockout_after_five_failures(client):
    u = await create_user(Role.operator, totp=False)
    for _ in range(5):
        res = await client.post(f"{API}/auth/login", json={"email": u.email, "password": "wrong-password-x"})
        assert res.status_code == 401
    # Endi to‘g‘ri parol bilan ham — 423
    res = await client.post(f"{API}/auth/login", json={"email": u.email, "password": PASSWORD})
    assert res.status_code == 423
    assert res.json()["detail"] == "locked"
    async with SessionLocal() as s:
        db_user = await s.get(User, u.id)
        assert db_user.locked_until and db_user.locked_until > datetime.now(UTC)


async def test_unknown_email_also_locks(client):
    """User enumeration yo‘q: mavjud bo‘lmagan email ham 5 xatodan keyin 423 qaytaradi."""
    for _ in range(5):
        res = await client.post(f"{API}/auth/login", json={"email": "nobody@neyromed.test", "password": "x" * 12})
        assert res.status_code == 401
    res = await client.post(f"{API}/auth/login", json={"email": "nobody@neyromed.test", "password": "x" * 12})
    assert res.status_code == 423


async def test_login_rate_limit_per_ip(client):
    for i in range(10):
        res = await client.post(f"{API}/auth/login", json={"email": f"x{i}@neyromed.test", "password": "y" * 12})
        assert res.status_code == 401
    res = await client.post(f"{API}/auth/login", json={"email": "z@neyromed.test", "password": "y" * 12})
    assert res.status_code == 429
    # Boshqa IP — cheklanmagan
    res = await client.post(
        f"{API}/auth/login", json={"email": "z@neyromed.test", "password": "y" * 12}, headers={"x-real-ip": "10.0.0.9"}
    )
    assert res.status_code == 401


async def test_login_rate_limit_per_email(client):
    for i in range(10):
        res = await client.post(
            f"{API}/auth/login",
            json={"email": "target@neyromed.test", "password": "y" * 12},
            headers={"x-real-ip": f"10.1.0.{i}"},
        )
        assert res.status_code in (401, 423)
    res = await client.post(
        f"{API}/auth/login", json={"email": "target@neyromed.test", "password": "y" * 12}, headers={"x-real-ip": "10.2.0.1"}
    )
    assert res.status_code == 429


async def test_totp_required_flow(client):
    u = await create_user(Role.editor)
    res = await client.post(f"{API}/auth/login", json={"email": u.email, "password": PASSWORD})
    assert res.status_code == 200
    assert res.json() == {"requires_totp": True}
    assert "set-cookie" not in res.headers

    bad = await client.post(f"{API}/auth/login", json={"email": u.email, "password": PASSWORD, "totp": "000000"})
    assert bad.status_code == 401

    code = totp_now(u.totp_secret)
    ok = await client.post(f"{API}/auth/login", json={"email": u.email, "password": PASSWORD, "totp": code})
    assert ok.status_code == 200 and ok.json()["user"]["role"] == "editor"

    # Bir kodni qayta ishlatish (replay) — rad etiladi
    async with new_client() as c2:
        again = await c2.post(f"{API}/auth/login", json={"email": u.email, "password": PASSWORD, "totp": code})
        assert again.status_code == 401


async def test_wrong_password_does_not_reveal_totp(client):
    u = await create_user(Role.admin)
    res = await client.post(f"{API}/auth/login", json={"email": u.email, "password": "wrong-password-x"})
    assert res.status_code == 401


# ───────────────────────── CSRF / Origin ─────────────────────────


async def test_login_requires_origin():
    u = await create_user(Role.operator, totp=False)
    async with new_client() as c:
        del c.headers["origin"]
        res = await c.post(f"{API}/auth/login", json={"email": u.email, "password": PASSWORD})
        assert res.status_code == 403 and res.json()["detail"] == "csrf_failed"
        evil = await c.post(
            f"{API}/auth/login", json={"email": u.email, "password": PASSWORD}, headers={"origin": "https://evil.example"}
        )
        assert evil.status_code == 403
        # Origin yo‘q, lekin Referer sayt domenidan — ruxsat
        ref = await c.post(
            f"{API}/auth/login", json={"email": u.email, "password": PASSWORD}, headers={"referer": f"{ORIGIN}/admin/login"}
        )
        assert ref.status_code == 200


async def test_mutation_without_csrf_header_is_403(admin_client):
    c, _ = admin_client
    token = c.headers.pop("x-csrf-token")
    res = await c.post(f"{API}/specialties", json={"slug": "test-x", "title": {"uz": "Test"}})
    assert res.status_code == 403 and res.json()["detail"] == "csrf_failed"
    res = await c.post(f"{API}/specialties", json={"slug": "test-x", "title": {"uz": "Test"}}, headers={"x-csrf-token": "x"})
    assert res.status_code == 403
    res = await c.post(f"{API}/specialties", json={"slug": "test-x", "title": {"uz": "Test"}}, headers={"x-csrf-token": token})
    assert res.status_code == 201


async def test_refresh_requires_origin(admin_client):
    c, _ = admin_client
    res = await c.post(f"{API}/auth/refresh", headers={"origin": "https://evil.example"})
    assert res.status_code == 403


# ───────────────────────── Refresh rotatsiyasi ─────────────────────────


async def test_refresh_rotation_and_reuse_detection(admin_client):
    c, user = admin_client
    r1 = c.cookies["nm_refresh"]

    res = await c.post(f"{API}/auth/refresh")
    assert res.status_code == 200 and res.json()["user"]["id"] == user.id
    r2 = res.cookies["nm_refresh"]
    assert r2 and r2 != r1

    # Eski (ishlatilgan) token qayta keldi → 401 va butun oila bekor
    async with new_client(cookie=f"nm_refresh={r1}") as thief:
        stolen = await thief.post(f"{API}/auth/refresh")
        assert stolen.status_code == 401
    async with new_client(cookie=f"nm_refresh={r2}") as legit:
        res = await legit.post(f"{API}/auth/refresh")
        assert res.status_code == 401

    async with SessionLocal() as s:
        rows = (await s.scalars(select(RefreshToken).where(RefreshToken.user_id == user.id))).all()
        assert rows and all(r.revoked for r in rows)
        assert all(len(r.token_hash) == 64 and r.token_hash not in (r1, r2) for r in rows)
    assert "refresh_reuse" in await _audit_actions()


async def test_refresh_without_cookie_is_401(client):
    res = await client.post(f"{API}/auth/refresh")
    assert res.status_code == 401


async def test_logout_revokes_family(admin_client):
    c, _ = admin_client
    r1 = c.cookies["nm_refresh"]
    res = await c.post(f"{API}/auth/logout")
    assert res.status_code == 204
    async with new_client(cookie=f"nm_refresh={r1}") as other:
        assert (await other.post(f"{API}/auth/refresh")).status_code == 401
    assert "logout" in await _audit_actions()


async def test_logout_requires_csrf(admin_client):
    c, _ = admin_client
    c.headers.pop("x-csrf-token")
    assert (await c.post(f"{API}/auth/logout")).status_code == 403


# ───────────────────────── token_version ─────────────────────────


async def test_password_change_invalidates_sessions(admin_client):
    c, user = admin_client
    old_access = c.cookies["nm_access"]
    old_refresh = c.cookies["nm_refresh"]

    weak = await c.post(f"{API}/auth/password", json={"current": PASSWORD, "new": "short"})
    assert weak.status_code == 422
    same_as_email = await c.post(f"{API}/auth/password", json={"current": PASSWORD, "new": user.email})
    assert same_as_email.status_code == 422
    common = await c.post(f"{API}/auth/password", json={"current": PASSWORD, "new": "Unbelievable"})
    assert common.status_code == 422
    wrong = await c.post(f"{API}/auth/password", json={"current": "wrong-current-pw", "new": "Brand-New-Passw0rd!"})
    assert wrong.status_code == 400

    res = await c.post(f"{API}/auth/password", json={"current": PASSWORD, "new": "Brand-New-Passw0rd!"})
    assert res.status_code == 204

    async with new_client(cookie=f"nm_access={old_access}") as stale:
        assert (await stale.get(f"{API}/auth/me")).status_code == 401
    async with new_client(cookie=f"nm_refresh={old_refresh}") as stale:
        assert (await stale.post(f"{API}/auth/refresh")).status_code == 401
    assert "password_changed" in await _audit_actions()

    async with new_client() as fresh:
        res = await fresh.post(
            f"{API}/auth/login",
            json={"email": user.email, "password": "Brand-New-Passw0rd!", "totp": pyotp.TOTP(user.totp_secret).now()},
        )
        assert res.status_code == 200


async def test_admin_revoke_sessions_and_role_change(admin_client):
    c, _ = admin_client
    op = await create_user(Role.operator, totp=False)
    async with new_client() as oc:
        await login(oc, op)
        assert (await oc.get(f"{API}/dashboard")).status_code == 200
        res = await c.post(f"{API}/users/{op.id}/revoke-sessions")
        assert res.status_code == 204
        assert (await oc.get(f"{API}/dashboard")).status_code == 401
        assert (await oc.post(f"{API}/auth/refresh")).status_code == 401

    async with new_client() as oc:
        await login(oc, op)
        res = await c.patch(f"{API}/users/{op.id}", json={"role": "editor"})
        assert res.status_code == 200 and res.json()["role"] == "editor"
        assert (await oc.get(f"{API}/auth/me")).status_code == 401
    assert "role_change" in await _audit_actions()


# ───────────────────────── 2FA sozlash ─────────────────────────


async def test_admin_without_totp_must_set_it_up():
    u = await create_user(Role.admin, totp=False)
    async with new_client() as c:
        res = await login(c, u)
        assert res.json()["user"]["totp_required"] is True
        assert (await c.get(f"{API}/doctors")).json()["detail"] == "totp_required"

        setup = await c.post(f"{API}/auth/totp/setup")
        assert setup.status_code == 200
        secret = setup.json()["secret"]
        assert setup.json()["otpauth_uri"].startswith("otpauth://totp/")

        bad = await c.post(f"{API}/auth/totp/enable", json={"code": "000000"})
        assert bad.status_code == 400
        ok = await c.post(f"{API}/auth/totp/enable", json={"code": pyotp.TOTP(secret).now()})
        assert ok.status_code == 200
        assert ok.json()["totp_enabled"] is True and ok.json()["totp_required"] is False
        assert (await c.get(f"{API}/doctors")).status_code == 200
        assert (await c.post(f"{API}/auth/totp/setup")).status_code == 409


async def test_operator_does_not_need_totp(operator_client):
    c, _ = operator_client
    me = (await c.get(f"{API}/auth/me")).json()
    assert me["totp_required"] is False and me["totp_enabled"] is False


async def test_login_extra_fields_rejected(client):
    res = await client.post(f"{API}/auth/login", json={"email": "a@b.c", "password": "x", "role": "admin"})
    assert res.status_code == 422
    assert res.json()["detail"] == "validation_error"
    assert "input" not in res.json()["errors"][0]
