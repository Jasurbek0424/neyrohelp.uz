"""Arizalar jonli signali (Redis pub/sub → SSE) va xodim ma'lumotlarini tahrirlash."""

import asyncio
import json
from datetime import UTC, datetime

from conftest import API, create_user, login, new_client

from app.api.admin.leads import _lead_stream
from app.core.redis import redis
from app.models import Role
from app.services import lead_events


async def _next_event(pubsub) -> dict:
    async with asyncio.timeout(3):
        while True:
            msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.2)
            if msg:
                return json.loads(msg["data"])


async def test_public_lead_publishes_event(client):
    pubsub = redis.pubsub()
    await pubsub.subscribe(lead_events.CHANNEL)
    try:
        body = {"full_name": "Ali Valiyev", "phone": "90 765 43 21", "consent": True, "elapsed_ms": 5000}
        assert (await client.post("/api/v1/public/leads", json=body)).status_code == 201
        event = await _next_event(pubsub)
        assert event["kind"] == "created" and isinstance(event["id"], int)
        assert set(event) == {"id", "kind"}  # payload'da shaxsiy ma'lumot yo‘q
    finally:
        await pubsub.aclose()


async def test_lead_stream_forwards_events():
    class Req:
        async def is_disconnected(self) -> bool:
            return False

    gen = _lead_stream(Req(), datetime.now(UTC).timestamp() + 30)
    try:
        assert await anext(gen) == "retry: 5000\n\n"
        await lead_events.publish(7, "updated")
        chunk = await asyncio.wait_for(anext(gen), 5)
        assert chunk.startswith("event: lead\n") and json.loads(chunk.split("data: ")[1]) == {
            "id": 7,
            "kind": "updated",
        }
    finally:
        await gen.aclose()


async def test_lead_stream_ends_at_deadline():
    class Req:
        async def is_disconnected(self) -> bool:
            return False

    chunks = [c async for c in _lead_stream(Req(), datetime.now(UTC).timestamp() - 1)]
    assert chunks == ["retry: 5000\n\n"]


async def test_events_endpoint_requires_lead_role(client):
    assert (await client.get(f"{API}/leads/events")).status_code == 401
    editor = await create_user(Role.editor)
    async with new_client() as c:
        await login(c, editor)
        assert (await c.get(f"{API}/leads/events")).status_code == 403


async def test_admin_edits_user_name_and_email(admin_client):
    c, _ = admin_client
    op = await create_user(Role.operator, totp=False)
    other = await create_user(Role.operator, totp=False)

    assert (await c.patch(f"{API}/users/{other.id}", json={"email": "band@neyrohelp.uz"})).status_code == 200
    assert (await c.patch(f"{API}/users/{op.id}", json={"email": "BAND@neyrohelp.uz"})).status_code == 409

    res = await c.patch(f"{API}/users/{op.id}", json={"name": "Yangi Ism", "email": "New.Operator@NeyroHelp.uz"})
    assert res.status_code == 200, res.text
    assert res.json()["email"] == "new.operator@neyrohelp.uz" and res.json()["name"] == "Yangi Ism"

    # Yangi email bilan kira oladi, eskisi bilan — yo‘q
    async with new_client() as oc:
        assert (
            await oc.post(f"{API}/auth/login", json={"email": op.email, "password": op.password})
        ).status_code == 401
        res = await oc.post(f"{API}/auth/login", json={"email": "new.operator@neyrohelp.uz", "password": op.password})
        assert res.status_code == 200
