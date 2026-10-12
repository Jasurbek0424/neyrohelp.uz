"""Boshlang‘ich ma’lumotlar:  uv run python -m app.seed
Baza bo‘sh bo‘lmasa hech narsa qilmaydi. Admin parol: SEED_ADMIN_PASSWORD yoki tasodifiy (konsolga chiqadi).
"""

import asyncio
import json
import os
import secrets
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import func, select

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import (
    Audience,
    Doctor,
    Post,
    PostCategory,
    PostStatus,
    Role,
    Service,
    ServiceCategory,
    Setting,
    Specialty,
    User,
)

DATA = json.loads((Path(__file__).parent / "seed_content.json").read_text(encoding="utf-8"))
L = ("uz", "ru", "en")


def per_locale_rows(by_locale: dict, fields: list[str]) -> list[dict]:
    """{"uz":[{a,b}], "ru":[...]} → [{"a":{"uz","ru","en"}, ...}]"""
    base = by_locale["uz"]
    return [{f: {loc: by_locale[loc][i][f] for loc in L} for f in fields} for i in range(len(base))]


def to_markdown(post: dict) -> str:
    body = post["body"]
    if post.get("callout"):
        c = post["callout"]
        block = f":::warning {c['title']}\n" + "\n".join(f"- {x}" for x in c["items"]) + "\n:::"
        body = body.replace(":::callout", block)
    return body.strip()


async def main() -> None:
    async with SessionLocal() as s:
        if (await s.scalar(select(func.count()).select_from(User))) > 0:
            print("Baza bo‘sh emas — seed o‘tkazib yuborildi.")
            return

        email = os.getenv("SEED_ADMIN_EMAIL", "admin@neyrohelp.uz")
        password = os.getenv("SEED_ADMIN_PASSWORD") or secrets.token_urlsafe(12)
        s.add(User(email=email, name="Administrator", password_hash=hash_password(password), role=Role.admin))

        st = DATA["settings"]
        s.add(
            Setting(
                key="site",
                value={
                    "phone": st["phone"],
                    "phone_display": st["phoneDisplay"],
                    "telegram": st["telegram"],
                    "license_number": st["licenseNumber"],
                    "address": st["address"],
                    "landmark": st["landmark"],
                    "hours_short": st["hoursShort"],
                    "response_time": st["responseTime"],
                    "hours": per_locale_rows(st["hours"], ["days", "time"]),
                    "stats": per_locale_rows(st["stats"], ["value", "label"]),
                    "directions": [
                        {"kind": row["kind"], "text": {loc: st["directions"][loc][i]["text"] for loc in L}}
                        for i, row in enumerate(st["directions"]["uz"])
                    ],
                },
            )
        )
        h = DATA["home"]
        s.add(
            Setting(
                key="home",
                value={
                    "hero_eyebrow": h["heroEyebrow"],
                    "hero_title": h["heroTitle"],
                    "hero_lead": h["heroLead"],
                    "hero_images": [],
                    "clinic_title": h["clinicTitle"],
                    "clinic_text": h["clinicText"],
                    "clinic_points": [{loc: h["clinicPoints"][loc][i] for loc in L} for i in range(len(h["clinicPoints"]["uz"]))],
                    "faq": per_locale_rows(h["faq"], ["question", "answer"]),
                },
            )
        )
        c = DATA["clinic"]
        s.add(
            Setting(
                key="clinic",
                value={
                    "title": c["title"],
                    "lead": c["lead"],
                    "cover_caption": c["coverCaption"],
                    "approach_title": c["approachTitle"],
                    "approach": per_locale_rows(c["approach"], ["title", "text"]),
                    "equipment": [{"name": e["name"], "purpose": e["purpose"]} for e in c["equipment"]],
                    "documents": [{"title": d["title"], "number": d["number"]} for d in c["documents"]],
                },
            )
        )

        for ci, cat in enumerate(DATA["serviceCategories"]):
            sc = ServiceCategory(
                slug=cat["slug"], title=cat["title"], summary=cat["summary"], description=cat["description"], order=(ci + 1) * 10
            )
            s.add(sc)
            await s.flush()
            for si, svc in enumerate(cat["services"]):
                s.add(
                    Service(
                        category_id=sc.id,
                        title=svc["title"],
                        note=svc["note"],
                        duration_minutes=svc.get("duration"),
                        order=(si + 1) * 10,
                    )
                )

        spec_ids = {}
        for i, sp in enumerate(DATA["specialties"]):
            obj = Specialty(slug=sp["slug"], title=sp["title"], order=(i + 1) * 10)
            s.add(obj)
            await s.flush()
            spec_ids[sp["slug"]] = obj.id

        plan = [
            ("nevrolog", Audience.adults), ("neyrofiziolog", Audience.all), ("bolalar-nevrologi", Audience.children),
            ("reabilitolog", Audience.adults), ("nevrolog", Audience.adults), ("neyrofiziolog", Audience.adults),
            ("bolalar-nevrologi", Audience.children), ("reabilitolog", Audience.all),
        ]
        doctor_ids = []
        lead_text = {
            "uz": "Bosh og‘rig‘i, bosh aylanishi va uyqu buzilishlari bilan murojaat qilgan bemorlarni qabul qiladi. [Shifokor haqida 2 jumla]",
            "ru": "Принимает пациентов с головной болью, головокружением и нарушениями сна. [2 предложения о враче]",
            "en": "Sees patients with headaches, dizziness and sleep problems. [2 sentences about the doctor]",
        }
        for i, (spec, aud) in enumerate(plan):
            d = Doctor(
                slug=f"shifokor-{i + 1}",
                full_name="[Shifokor F.I.O.]",
                specialty_id=spec_ids[spec],
                audience=aud,
                lead=lead_text,
                qualification={"uz": "[oliy toifa]", "ru": "[высшая категория]", "en": "[top category]"},
                languages={"uz": "O‘zbek, rus", "ru": "Узбекский, русский", "en": "Uzbek, Russian"},
                work_days=["mon", "tue", "wed", "thu", "fri", "sat"],
                education=[
                    {"years": "[yil]–[yil]", "place": {"uz": "[Tibbiyot akademiyasi]"}, "detail": {"uz": "Davolash ishi"}},
                    {"years": "[yil]–[yil]", "place": {"uz": "[Tibbiyot akademiyasi]"}, "detail": {"uz": "Nevrologiya bo‘yicha rezidentura"}},
                ],
                career=[{"years": "[yil] — hozir", "place": {"uz": "NeyroHelp"}, "detail": {"uz": "[lavozim]"}}],
                certificates=[{"title": {"uz": "[Sertifikat nomi]"}, "year": "[yil]"}],
                order=(i + 1) * 10,
                show_on_home=i < 4,
            )
            s.add(d)
            await s.flush()
            doctor_ids.append(d.id)

        pc_ids = {}
        for i, pc in enumerate(DATA["postCategories"]):
            obj = PostCategory(slug=pc["slug"], title=pc["title"], order=(i + 1) * 10)
            s.add(obj)
            await s.flush()
            pc_ids[pc["slug"]] = obj.id

        now = datetime.now(UTC)
        for i, p in enumerate(DATA["posts"]):
            s.add(
                Post(
                    slug=p["slug"],
                    title={"uz": p["title"]},
                    excerpt={"uz": p["excerpt"]},
                    body={"uz": to_markdown(p)},
                    category_id=pc_ids[p["category"]],
                    author_id=doctor_ids[0 if i % 2 == 0 else 4],
                    status=PostStatus.published,
                    published_at=now - timedelta(days=p["daysAgo"]),
                    reading_minutes=p["minutes"],
                    featured=bool(p.get("featured")),
                )
            )
        await s.commit()
        print("Seed tugadi.")
        print(f"Admin: {email}  parol: {password}  — birinchi kirishdan keyin parolni almashtiring.")


if __name__ == "__main__":
    asyncio.run(main())
