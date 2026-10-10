import pytest
from conftest import API, create_user, new_client

from app.models import Role


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/doctors"),
        ("post", "/doctors"),
        ("get", "/services"),
        ("get", "/posts"),
        ("get", "/media"),
        ("get", "/settings/site"),
        ("put", "/settings/site"),
        ("get", "/specialties"),
        ("get", "/users"),
        ("get", "/audit"),
        ("get", "/leads/export"),
    ],
)
async def test_operator_forbidden(operator_client, method, path):
    c, _ = operator_client
    res = await c.request(method, f"{API}{path}", json={} if method != "get" else None)
    assert res.status_code == 403
    assert res.json()["detail"] == "forbidden"


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/leads"),
        ("get", "/leads/1"),
        ("post", "/leads/1/take"),
        ("patch", "/leads/1"),
        ("get", "/leads/export"),
        ("get", "/users"),
        ("post", "/users"),
        ("patch", "/users/1"),
        ("post", "/users/1/revoke-sessions"),
        ("get", "/audit"),
    ],
)
async def test_editor_forbidden(editor_client, method, path):
    c, _ = editor_client
    res = await c.request(method, f"{API}{path}", json={} if method != "get" else None)
    assert res.status_code == 403


async def test_operator_allowed_endpoints(operator_client):
    c, _ = operator_client
    assert (await c.get(f"{API}/dashboard")).status_code == 200
    assert (await c.get(f"{API}/leads")).status_code == 200
    dash = (await c.get(f"{API}/dashboard")).json()
    assert dash["content_todo"] is None and dash["recent_posts"] == []


async def test_editor_allowed_endpoints(editor_client):
    c, _ = editor_client
    for path in ("/dashboard", "/doctors", "/services", "/posts", "/media", "/settings/home", "/specialties"):
        assert (await c.get(f"{API}{path}")).status_code == 200, path
    dash = (await c.get(f"{API}/dashboard")).json()
    assert dash["content_todo"] is not None


async def test_unauthenticated_is_401():
    async with new_client() as c:
        for path in ("/dashboard", "/leads", "/doctors", "/users", "/auth/me"):
            res = await c.get(f"{API}{path}")
            assert res.status_code == 401 and res.json()["detail"] == "not_authenticated"


async def test_forged_jwt_rejected():
    import jwt

    # alg=none va noto‘g‘ri kalit — ikkalasi ham rad etiladi
    none_token = jwt.encode({"sub": "1", "ver": 0, "typ": "access"}, key=None, algorithm="none")
    wrong_key = jwt.encode({"sub": "1", "ver": 0, "typ": "access"}, "x" * 32, algorithm="HS256")
    for token in (none_token, wrong_key):
        async with new_client(cookie=f"nm_access={token}") as c:
            assert (await c.get(f"{API}/auth/me")).status_code == 401


async def test_users_admin_only_and_self_protection(admin_client):
    c, admin = admin_client
    res = await c.post(
        f"{API}/users", json={"email": "New.Op@neyromed.uz", "name": "Yangi", "role": "operator", "password": "short"}
    )
    assert res.status_code == 422
    res = await c.post(
        f"{API}/users",
        json={"email": "New.Op@neyromed.uz", "name": "Yangi", "role": "operator", "password": "Long-Enough-Pass-1"},
    )
    assert res.status_code == 201
    created = res.json()
    assert created["email"] == "new.op@neyromed.uz"
    assert "password_hash" not in created and "totp_secret" not in created
    dup = await c.post(
        f"{API}/users",
        json={"email": "new.op@neyromed.uz", "name": "Yangi", "role": "operator", "password": "Long-Enough-Pass-1"},
    )
    assert dup.status_code == 409

    users = (await c.get(f"{API}/users")).json()
    assert {u["id"] for u in users} >= {admin.id, created["id"]}

    # O‘zini adminlikdan tushira olmaydi
    res = await c.patch(f"{API}/users/{admin.id}", json={"role": "operator"})
    assert res.status_code == 409
    res = await c.patch(f"{API}/users/{admin.id}", json={"is_active": False})
    assert res.status_code == 409

    # Rol eskalatsiyasi: operator o‘zini admin qila olmaydi
    op = await create_user(Role.operator, totp=False)
    from conftest import login

    async with new_client() as oc:
        await login(oc, op)
        res = await oc.patch(f"{API}/users/{op.id}", json={"role": "admin"})
        assert res.status_code == 403

    audit = (await c.get(f"{API}/audit", params={"action": "user_create"})).json()
    assert audit["total"] == 1 and audit["items"][0]["ip"]
