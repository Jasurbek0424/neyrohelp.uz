"""2FA o‘chiq rejim va administrator xodimga parol berishi."""

from conftest import API, create_user, login, new_client

from app.core.config import settings
from app.models import Role


async def test_twofa_disabled_login_with_password_only(monkeypatch):
    monkeypatch.setattr(settings, "twofa_enabled", False)
    # 2FA yoqilgan foydalanuvchi ham kod so‘ralmasdan kiradi; 2FA'siz admin panelni ochadi
    for totp in (True, False):
        u = await create_user(Role.admin, totp=totp)
        async with new_client() as c:
            res = await c.post(f"{API}/auth/login", json={"email": u.email, "password": u.password})
            assert res.status_code == 200, res.text
            me = res.json()["user"]
            assert me["totp_required"] is False and me["twofa_available"] is False
            assert (await c.get(f"{API}/dashboard")).status_code == 200


async def test_admin_sets_operator_password(admin_client):
    c, admin = admin_client
    op = await create_user(Role.operator, totp=False)
    new_pw = "Operator-New-Pass-2026"

    async with new_client() as oc:
        await login(oc, op)

        res = await c.post(f"{API}/users/{op.id}/password", json={"password": "short"})
        assert res.status_code == 422
        res = await c.post(f"{API}/users/{op.id}/password", json={"password": "password1234"})
        assert res.status_code == 422  # zaif / mashhur parol
        res = await c.post(f"{API}/users/{op.id}/password", json={"password": new_pw})
        assert res.status_code == 204

        # Operatorning eski sessiyasi yopildi
        assert (await oc.get(f"{API}/auth/me")).status_code == 401

    async with new_client() as oc:
        assert (await oc.post(f"{API}/auth/login", json={"email": op.email, "password": op.password})).status_code == 401
        assert (await oc.post(f"{API}/auth/login", json={"email": op.email, "password": new_pw})).status_code == 200

    # o‘ziga emas
    assert (await c.post(f"{API}/users/{admin.id}/password", json={"password": new_pw})).status_code == 409


async def test_only_admin_sets_passwords(operator_client):
    c, _ = operator_client
    other = await create_user(Role.operator, totp=False)
    res = await c.post(f"{API}/users/{other.id}/password", json={"password": "Operator-New-Pass-2026"})
    assert res.status_code == 403


async def test_audit_filters_and_lead_status_log(admin_client, operator_client):
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo

    from app.core.db import SessionLocal
    from app.models import Lead

    a, _ = admin_client
    o, op = operator_client
    async with SessionLocal() as s:
        lead = Lead(full_name="Test Bemor", phone="+998901234567", message="bosh og‘riq", locale="uz", consent=True)
        s.add(lead)
        await s.commit()
        lead_id = lead.id

    assert (await o.post(f"{API}/leads/{lead_id}/take")).status_code == 200
    res = await o.patch(f"{API}/leads/{lead_id}", json={"status": "booked"})
    assert res.status_code == 200 and res.json()["status"] == "booked"

    res = await a.get(f"{API}/audit", params={"user_id": op.id, "group": "leads"})
    items = res.json()["items"]
    assert [i["action"] for i in items] == ["lead_status", "lead_take"]
    assert items[0]["meta"] == {"from": "in_progress", "to": "booked"}
    assert items[0]["user_name"] == op.name and items[0]["user_role"] == "operator"

    today = datetime.now(ZoneInfo("Asia/Tashkent")).date()
    res = await a.get(f"{API}/audit", params={"date_from": (today + timedelta(days=2)).isoformat()})
    assert res.json()["total"] == 0
    res = await a.get(f"{API}/audit", params={"date_from": (today - timedelta(days=1)).isoformat(), "date_to": (today + timedelta(days=1)).isoformat(), "user_id": op.id})
    assert res.json()["total"] >= 3  # login + take + status

    # operator jurnalni ko‘ra olmaydi
    assert (await o.get(f"{API}/audit")).status_code == 403
