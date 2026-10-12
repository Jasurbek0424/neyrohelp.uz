import io
from datetime import UTC, datetime, timedelta

from conftest import API
from PIL import Image
from sqlalchemy import select

from app.core.db import SessionLocal
from app.core.redis import redis
from app.models import AuditLog

PUB = "/api/v1/public"


async def make_specialty(c, slug="nevrolog") -> int:
    res = await c.post(f"{API}/specialties", json={"slug": slug, "title": {"uz": "Nevrolog", "ru": "Невролог"}})
    assert res.status_code == 201, res.text
    return res.json()["id"]


async def make_image(c) -> str:
    buf = io.BytesIO()
    Image.new("RGB", (1000, 800), (1, 2, 3)).save(buf, format="PNG")
    res = await c.post(f"{API}/media", files={"file": ("a.png", buf.getvalue(), "image/png")})
    assert res.status_code == 201
    return res.json()["id"]


def doctor_body(spec_id: int, **kw) -> dict:
    return {
        "slug": "aliyev-a",
        "full_name": "Aliyev Anvar",
        "specialty_id": spec_id,
        "audience": "adults",
        "lead": {"uz": "Tajribali nevrolog", "ru": "Опытный невролог"},
        "qualification": {"uz": "Oliy toifa"},
        "price": 150000,
        "work_days": ["mon", "wed"],
        "education": [{"years": "2008–2014", "place": {"uz": "TTA"}, "detail": {"uz": "Davolash ishi"}}],
        "certificates": [{"title": {"uz": "Sertifikat"}, "year": "2021"}],
        "seo": {"title": {"uz": "Aliyev"}, "description": {"uz": "Nevrolog"}},
        **kw,
    }


# ───────────────────────── Shifokorlar + public kesh ─────────────────────────


async def test_doctor_crud_and_public_cache_invalidation(editor_client, client):
    c, _ = editor_client
    spec = await make_specialty(c)
    photo = await make_image(c)
    res = await c.post(f"{API}/doctors", json=doctor_body(spec, photo_id=photo))
    assert res.status_code == 201, res.text
    doc = res.json()
    assert doc["photo"]["id"] == photo and doc["completeness"] == {"uz": True, "ru": False, "en": False}
    assert doc["education"][0]["place"] == {"uz": "TTA"}

    # Public javob keshlanadi
    pub = await client.get(f"{PUB}/doctors/aliyev-a", params={"locale": "uz"})
    assert pub.status_code == 200 and pub.json()["full_name"] == "Aliyev Anvar"
    assert await redis.exists("cache:doctor:aliyev-a:uz")
    listing = await client.get(f"{PUB}/doctors", params={"locale": "uz"})
    assert listing.json()[0]["full_name"] == "Aliyev Anvar"

    # Admin yangilaydi → kesh tozalanadi → public yangi qiymatni qaytaradi
    res = await c.patch(f"{API}/doctors/{doc['id']}", json={"full_name": "Aliyev Anvar Akmalovich"})
    assert res.status_code == 200
    assert not await redis.exists("cache:doctor:aliyev-a:uz")
    pub = await client.get(f"{PUB}/doctors/aliyev-a", params={"locale": "uz"})
    assert pub.json()["full_name"] == "Aliyev Anvar Akmalovich"
    listing = await client.get(f"{PUB}/doctors", params={"locale": "uz"})
    assert listing.json()[0]["full_name"] == "Aliyev Anvar Akmalovich"

    # Slug o‘zgarsa eski slug 404
    res = await c.patch(f"{API}/doctors/{doc['id']}", json={"slug": "aliyev-anvar", "is_published": True})
    assert res.status_code == 200
    assert (await client.get(f"{PUB}/doctors/aliyev-a", params={"locale": "uz"})).status_code == 404
    assert (await client.get(f"{PUB}/doctors/aliyev-anvar", params={"locale": "uz"})).status_code == 200

    # Nashrdan olinsa public'da yo‘qoladi
    await c.patch(f"{API}/doctors/{doc['id']}", json={"is_published": False})
    assert (await client.get(f"{PUB}/doctors/aliyev-anvar", params={"locale": "uz"})).status_code == 404

    lst = (await c.get(f"{API}/doctors")).json()
    assert lst[0]["specialty_title"] == "Nevrolog" and lst[0]["photo"]["id"] == photo

    # Narx o‘zgarishi audit logga
    await c.patch(f"{API}/doctors/{doc['id']}", json={"price": 200000})
    async with SessionLocal() as s:
        prices = (await s.scalars(select(AuditLog).where(AuditLog.action == "price_change"))).all()
        assert any(p.meta == {"old": 150000, "new": 200000} for p in prices)

    # Ishlatilayotgan rasmni o‘chirib bo‘lmaydi
    assert (await c.delete(f"{API}/media/{photo}")).status_code == 409
    assert (await c.delete(f"{API}/specialties/{spec}")).status_code == 409

    assert (await c.delete(f"{API}/doctors/{doc['id']}")).status_code == 204
    assert (await c.get(f"{API}/doctors/{doc['id']}")).status_code == 404
    assert (await c.delete(f"{API}/media/{photo}")).status_code == 204


async def test_doctor_validation(editor_client):
    c, _ = editor_client
    spec = await make_specialty(c)
    assert (await c.post(f"{API}/doctors", json=doctor_body(spec))).status_code == 201
    dup = await c.post(f"{API}/doctors", json=doctor_body(spec))
    assert dup.status_code == 409 and dup.json()["detail"] == "slug_taken"
    bad = [
        doctor_body(spec, slug="Bad Slug!"),
        doctor_body(spec, slug="ok-slug", specialty_id=99999),
        doctor_body(spec, slug="ok-slug", photo_id="00000000-0000-0000-0000-000000000000"),
        doctor_body(spec, slug="ok-slug", lead={"uz": "x", "de": "y"}),
        doctor_body(spec, slug="ok-slug", lead={"uz": "x" * 2001}),
        doctor_body(spec, slug="ok-slug", work_days=["funday"]),
        doctor_body(spec, slug="ok-slug", price=-1),
        doctor_body(spec, slug="ok-slug", unknown=1),
    ]
    for body in bad:
        res = await c.post(f"{API}/doctors", json=body)
        assert res.status_code == 422, body
        assert res.json()["detail"] == "validation_error"
    doc_id = (await c.get(f"{API}/doctors")).json()[0]["id"]
    assert (await c.patch(f"{API}/doctors/{doc_id}", json={"full_name": None})).status_code == 422


# ───────────────────────── Xizmatlar ─────────────────────────


async def test_services_crud_bulk_and_public(editor_client, client):
    c, _ = editor_client
    cat = await c.post(
        f"{API}/service-categories", json={"slug": "diagnostika", "title": {"uz": "Diagnostika"}, "order": 1}
    )
    assert cat.status_code == 201
    cat_id = cat.json()["id"]
    s1 = (await c.post(f"{API}/services", json={"category_id": cat_id, "title": {"uz": "EEG"}, "price": 100})).json()
    s2 = (await c.post(f"{API}/services", json={"category_id": cat_id, "title": {"uz": "MRT"}})).json()

    pub = (await client.get(f"{PUB}/services", params={"locale": "uz"})).json()
    assert pub[0]["services"][0]["price"] == 100

    res = await c.patch(
        f"{API}/services/bulk",
        json={"items": [{"id": s1["id"], "price": 120}, {"id": s2["id"], "price": 300, "price_from": True}]},
    )
    assert res.status_code == 200, res.text
    services = {x["id"]: x for x in res.json()[0]["services"]}
    assert services[s1["id"]]["price"] == 120 and services[s2["id"]]["price_from"] is True

    pub = (await client.get(f"{PUB}/services", params={"locale": "uz"})).json()
    assert {x["price"] for x in pub[0]["services"]} == {120, 300}

    async with SessionLocal() as s:
        logs = (await s.scalars(select(AuditLog).where(AuditLog.action == "price_change"))).all()
        assert any(log.meta.get("price") == {"old": 100, "new": 120} for log in logs)

    bad = await c.patch(f"{API}/services/bulk", json={"items": [{"id": 99999, "price": 1}]})
    assert bad.status_code == 422
    dup = await c.patch(f"{API}/services/bulk", json={"items": [{"id": s1["id"]}, {"id": s1["id"]}]})
    assert dup.status_code == 422
    too_many = await c.patch(f"{API}/services/bulk", json={"items": [{"id": i} for i in range(1, 202)]})
    assert too_many.status_code == 422

    res = await c.patch(f"{API}/services/{s1['id']}", json={"is_active": False, "title": {"uz": "EEG (yangi)"}})
    assert res.status_code == 200 and res.json()["title"] == {"uz": "EEG (yangi)"}
    pub = (await client.get(f"{PUB}/services", params={"locale": "uz"})).json()
    assert [x["id"] for x in pub[0]["services"]] == [s2["id"]]

    assert (await c.delete(f"{API}/services/{s2['id']}")).status_code == 204
    assert (await c.delete(f"{API}/service-categories/{cat_id}")).status_code == 204
    assert (await c.get(f"{API}/services")).json() == []


# ───────────────────────── Maqolalar ─────────────────────────


async def test_posts_rules(editor_client, client):
    c, _ = editor_client
    cat = (await c.post(f"{API}/post-categories", json={"slug": "maslahat", "title": {"uz": "Maslahat"}})).json()
    body_uz = " ".join(["so‘z"] * 900)  # 900 so‘z → 5 daqiqa
    base = {"slug": "bosh-ogrigi", "title": {"uz": "Bosh og‘rig‘i"}, "body": {"uz": body_uz}, "category_id": cat["id"]}

    past = (datetime.now(UTC) - timedelta(hours=1)).isoformat()
    res = await c.post(f"{API}/posts", json={**base, "status": "scheduled", "published_at": past})
    assert res.status_code == 422 and res.json()["errors"][0]["loc"][-1] == "published_at"
    res = await c.post(f"{API}/posts", json={**base, "status": "scheduled"})
    assert res.status_code == 422
    res = await c.post(f"{API}/posts", json={**base, "status": "scheduled", "published_at": "2030-01-01T10:00:00"})
    assert res.status_code == 422  # vaqt zonasi majburiy

    future = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    res = await c.post(f"{API}/posts", json={**base, "status": "scheduled", "published_at": future})
    assert res.status_code == 201, res.text
    post = res.json()
    assert post["reading_minutes"] == 5 and post["status"] == "scheduled"
    assert (await client.get(f"{PUB}/posts/bosh-ogrigi", params={"locale": "uz"})).status_code == 404

    res = await c.patch(f"{API}/posts/{post['id']}", json={"status": "published", "published_at": None})
    assert res.status_code == 200
    assert res.json()["published_at"] is not None
    pub = await client.get(f"{PUB}/posts/bosh-ogrigi", params={"locale": "uz"})
    assert pub.status_code == 200 and pub.json()["reading_minutes"] == 5

    res = await c.patch(f"{API}/posts/{post['id']}", json={"body": {"uz": "qisqa", "ru": "коротко"}})
    assert res.json()["reading_minutes"] == 1
    assert res.json()["completeness"]["ru"] is False  # ru sarlavha yo‘q

    long_body = {"uz": "x" * 20001}
    assert (await c.patch(f"{API}/posts/{post['id']}", json={"body": long_body})).status_code == 422
    assert (await c.patch(f"{API}/posts/{post['id']}", json={"body": {"uz": "x" * 20000}})).status_code == 200

    page = (await c.get(f"{API}/posts", params={"q": "og‘ri"})).json()
    assert page["total"] == 1 and page["items"][0]["slug"] == "bosh-ogrigi"
    assert (await c.get(f"{API}/posts", params={"status": "draft"})).json()["total"] == 0

    assert (await c.delete(f"{API}/post-categories/{cat['id']}")).status_code == 409
    assert (await c.delete(f"{API}/posts/{post['id']}")).status_code == 204
    assert (await client.get(f"{PUB}/posts/bosh-ogrigi", params={"locale": "uz"})).status_code == 404
    assert (await c.delete(f"{API}/post-categories/{cat['id']}")).status_code == 204


# ───────────────────────── Sozlamalar ─────────────────────────


SITE = {
    "phone": "+998712345678",
    "phone_display": "+998 71 234 56 78",
    "telegram": "neyrohelp",
    "address": {"uz": "Toshkent", "ru": "Ташкент"},
    "hours": [{"days": {"uz": "Du–Ju"}, "time": {"uz": "09:00–18:00"}}],
    "directions": [{"kind": "metro", "text": {"uz": "Metro yaqin"}}],
    "lat": 41.3,
    "lng": 69.2,
    "yandex_map_url": "https://yandex.uz/maps/-/abc",
}


async def test_settings_strict_and_public(editor_client, client):
    c, _ = editor_client
    assert (await c.get(f"{API}/settings/unknown")).status_code == 422
    assert (await client.get(f"{PUB}/site", params={"locale": "ru"})).status_code == 200  # kesh to‘ladi

    res = await c.put(f"{API}/settings/site", json=SITE)
    assert res.status_code == 200, res.text
    assert res.json()["address"] == {"uz": "Toshkent", "ru": "Ташкент"}

    pub = (await client.get(f"{PUB}/site", params={"locale": "ru"})).json()
    assert pub["address"] == "Ташкент" and pub["phone"] == "+998712345678"
    assert pub["directions"] == [{"kind": "metro", "text": "Metro yaqin"}]

    bad = [
        {**SITE, "phone": "12345"},
        {**SITE, "evil": 1},
        {**SITE, "yandex_map_url": "javascript:alert(1)"},
        {**SITE, "directions": [{"kind": "plane", "text": {"uz": "x"}}]},
        {**SITE, "address": {"uz": "x", "fr": "y"}},
        {**SITE, "lat": 200},
    ]
    for body in bad:
        assert (await c.put(f"{API}/settings/site", json=body)).status_code == 422, body


async def test_settings_media_resolved(editor_client, client):
    c, _ = editor_client
    img = await make_image(c)
    pdf = await c.post(
        f"{API}/media", files={"file": ("l.pdf", b"%PDF-1.4\n%%EOF\n", "application/pdf")}
    )
    pdf_id = pdf.json()["id"]
    clinic = {
        "title": {"uz": "Klinika"},
        "cover_id": img,
        "equipment": [{"name": {"uz": "EEG"}, "image_id": img}],
        "documents": [{"title": {"uz": "Litsenziya"}, "number": "№1", "file_id": pdf_id}],
    }
    res = await c.put(f"{API}/settings/clinic", json=clinic)
    assert res.status_code == 200, res.text
    out = res.json()
    assert out["cover_id"] == img and out["cover"]["id"] == img
    assert out["equipment"][0]["image"]["id"] == img
    assert out["documents"][0]["file"]["kind"] == "document"
    got = (await c.get(f"{API}/settings/clinic")).json()
    assert got["cover"]["id"] == img

    pub = (await client.get(f"{PUB}/pages/clinic", params={"locale": "uz"})).json()
    assert pub["cover"]["id"] == img and pub["documents"][0]["file_url"].endswith(".pdf")

    # Rasm o‘rniga hujjat (yoki aksincha) — 422
    wrong = {**clinic, "cover_id": pdf_id}
    assert (await c.put(f"{API}/settings/clinic", json=wrong)).status_code == 422
    wrong = {**clinic, "documents": [{"title": {"uz": "x"}, "file_id": img}]}
    assert (await c.put(f"{API}/settings/clinic", json=wrong)).status_code == 422

    dash = (await c.get(f"{API}/dashboard")).json()
    assert dash["content_todo"]["documents_without_file"] == 0

    async with SessionLocal() as s:
        assert await s.scalar(select(AuditLog).where(AuditLog.action == "settings_update"))


async def test_home_settings_purges_public(editor_client, client):
    c, _ = editor_client
    await c.put(f"{API}/settings/home", json={"hero_title": {"uz": "Eski"}})
    assert (await client.get(f"{PUB}/pages/home", params={"locale": "uz"})).json()["hero_title"] == "Eski"
    await c.put(f"{API}/settings/home", json={"hero_title": {"uz": "Yangi"}, "faq": [{"question": {"uz": "Q"}}]})
    home = (await client.get(f"{PUB}/pages/home", params={"locale": "uz"})).json()
    assert home["hero_title"] == "Yangi" and home["faq"][0]["question"] == "Q"
