"""Public o‘qish endpointlari. Hammasi Redis'da keshlanadi va teg bilan tozalanadi."""

import math
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.core.cache import get_or_set
from app.core.deps import SessionDep
from app.core.i18n import Locale, t
from app.models import Doctor, Media, Post, PostCategory, PostStatus, ServiceCategory, Setting, Specialty
from app.schemas import public as s
from app.services import serialize as ser

router = APIRouter(prefix="/public", tags=["public"])

LocaleQ = Annotated[Locale, Query()]
CACHE_HEADER = "public, max-age=60, stale-while-revalidate=600"


def _cache_headers(response: Response) -> None:
    response.headers["Cache-Control"] = CACHE_HEADER


async def _setting(session: SessionDep, key: str) -> dict:
    row = await session.get(Setting, key)
    return row.value if row else {}


async def _media_map(session: SessionDep, ids: list) -> dict[str, Media]:
    ids = [uuid.UUID(str(i)) for i in ids if i]
    if not ids:
        return {}
    rows = (await session.scalars(select(Media).where(Media.id.in_(ids)))).all()
    return {str(m.id): m for m in rows}


@router.get("/site", response_model=s.SiteOut)
async def site(locale: LocaleQ, session: SessionDep, response: Response):
    _cache_headers(response)

    async def load():
        v = await _setting(session, "site")
        return s.SiteOut(
            phone=v.get("phone", ""),
            phone_display=v.get("phone_display") or v.get("phone", ""),
            telegram=v.get("telegram"),
            email=v.get("email"),
            address=t(v.get("address"), locale),
            landmark=t(v.get("landmark"), locale),
            hours=[s.HoursRow(days=t(h.get("days"), locale), time=t(h.get("time"), locale)) for h in v.get("hours", [])],
            hours_short=t(v.get("hours_short"), locale),
            response_time=t(v.get("response_time"), locale),
            stats=[s.StatRow(value=t(x.get("value"), locale), label=t(x.get("label"), locale)) for x in v.get("stats", [])],
            directions=[s.DirectionRow(kind=x["kind"], text=t(x.get("text"), locale)) for x in v.get("directions", [])],
            license_number=v.get("license_number"),
            lat=v.get("lat"),
            lng=v.get("lng"),
            yandex_map_url=v.get("yandex_map_url"),
            google_map_url=v.get("google_map_url"),
        ).model_dump(mode="json")

    return await get_or_set(f"site:{locale}", ["settings"], load)


@router.get("/pages/home", response_model=s.HomeOut)
async def home(locale: LocaleQ, session: SessionDep, response: Response):
    _cache_headers(response)

    async def load():
        v = await _setting(session, "home")
        media = await _media_map(session, [x.get("image_id") for x in v.get("hero_images", [])] + [v.get("clinic_image_id")])
        return s.HomeOut(
            hero_eyebrow=t(v.get("hero_eyebrow"), locale),
            hero_title=t(v.get("hero_title"), locale),
            hero_lead=t(v.get("hero_lead"), locale),
            hero_images=[
                s.HeroImage(image=ser.media_out(media.get(str(x.get("image_id"))), locale), label=t(x.get("label"), locale))
                for x in v.get("hero_images", [])
            ],
            clinic_title=t(v.get("clinic_title"), locale),
            clinic_text=t(v.get("clinic_text"), locale),
            clinic_points=[t(p, locale) for p in v.get("clinic_points", [])],
            clinic_image=ser.media_out(media.get(str(v.get("clinic_image_id"))), locale),
            faq=[s.FaqRow(question=t(f.get("question"), locale), answer=t(f.get("answer"), locale)) for f in v.get("faq", [])],
        ).model_dump(mode="json")

    return await get_or_set(f"home:{locale}", ["home", "media"], load)


@router.get("/pages/clinic", response_model=s.ClinicOut)
async def clinic(locale: LocaleQ, session: SessionDep, response: Response):
    _cache_headers(response)

    async def load():
        v = await _setting(session, "clinic")
        ids = [v.get("cover_id")] + [e.get("image_id") for e in v.get("equipment", [])] + [d.get("file_id") for d in v.get("documents", [])]
        media = await _media_map(session, ids)
        def file_url(fid):
            m = media.get(str(fid)) if fid else None
            return ser.media_url(m.variants.get("original", "")) if m else None
        return s.ClinicOut(
            title=t(v.get("title"), locale),
            lead=t(v.get("lead"), locale),
            cover=ser.media_out(media.get(str(v.get("cover_id"))), locale),
            cover_caption=t(v.get("cover_caption"), locale),
            approach_title=t(v.get("approach_title"), locale),
            approach=[s.ApproachRow(title=t(a.get("title"), locale), text=t(a.get("text"), locale)) for a in v.get("approach", [])],
            equipment=[
                s.EquipmentRow(name=t(e.get("name"), locale), purpose=t(e.get("purpose"), locale), image=ser.media_out(media.get(str(e.get("image_id"))), locale))
                for e in v.get("equipment", [])
            ],
            documents=[
                s.DocumentRow(title=t(d.get("title"), locale), number=d.get("number", ""), file_url=file_url(d.get("file_id")))
                for d in v.get("documents", [])
            ],
        ).model_dump(mode="json")

    return await get_or_set(f"clinic:{locale}", ["clinic", "media"], load)


@router.get("/services", response_model=list[s.ServiceGroupOut])
async def services(locale: LocaleQ, session: SessionDep, response: Response):
    _cache_headers(response)

    async def load():
        cats = (await session.scalars(select(ServiceCategory).order_by(ServiceCategory.order))).all()
        return [ser.group_out(c, locale).model_dump(mode="json") for c in cats]

    return await get_or_set(f"services:{locale}", ["services"], load)


@router.get("/specialties", response_model=list[s.SpecialtyOut])
async def specialties(locale: LocaleQ, session: SessionDep, response: Response):
    _cache_headers(response)

    async def load():
        rows = (await session.scalars(select(Specialty).order_by(Specialty.order))).all()
        return [ser.specialty_out(x, locale).model_dump(mode="json") for x in rows]

    return await get_or_set(f"specialties:{locale}", ["doctors"], load)


@router.get("/doctors", response_model=list[s.DoctorCardOut])
async def doctors(
    locale: LocaleQ,
    session: SessionDep,
    response: Response,
    specialty: Annotated[str | None, Query(max_length=80, pattern=r"^[a-z0-9-]+$")] = None,
    home: bool = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    exclude: Annotated[int | None, Query(ge=1)] = None,
):
    _cache_headers(response)

    async def load():
        q = select(Doctor).where(Doctor.is_published.is_(True)).order_by(Doctor.order, Doctor.id)
        if specialty:
            q = q.join(Doctor.specialty).where(Specialty.slug == specialty)
        if home:
            q = q.where(Doctor.show_on_home.is_(True))
        if exclude:
            q = q.where(Doctor.id != exclude)
        rows = (await session.scalars(q.limit(limit))).unique().all()
        return [ser.doctor_card(d, locale).model_dump(mode="json") for d in rows]

    key = f"doctors:{locale}:{specialty}:{home}:{limit}:{exclude}"
    return await get_or_set(key, ["doctors", "media"], load)


@router.get("/doctors/{slug}", response_model=s.DoctorOut)
async def doctor(slug: str, locale: LocaleQ, session: SessionDep, response: Response):
    if len(slug) > 100:
        raise HTTPException(404, "not_found")
    _cache_headers(response)

    async def load():
        d = await session.scalar(select(Doctor).where(Doctor.slug == slug, Doctor.is_published.is_(True)))
        if not d:
            return None
        media = await _media_map(session, [c.get("image_id") for c in d.certificates or []])
        return ser.doctor_full(d, locale, media).model_dump(mode="json")

    data = await get_or_set(f"doctor:{slug}:{locale}", [f"doctor:{slug}", "doctors", "media"], load)
    if data is None:
        raise HTTPException(404, "not_found")
    return data


@router.get("/post-categories", response_model=list[s.PostCategoryOut])
async def post_categories(locale: LocaleQ, session: SessionDep, response: Response):
    _cache_headers(response)

    async def load():
        rows = (await session.scalars(select(PostCategory).order_by(PostCategory.order))).all()
        return [s.PostCategoryOut(id=c.id, slug=c.slug, title=t(c.title, locale)).model_dump(mode="json") for c in rows]

    return await get_or_set(f"post-categories:{locale}", ["posts"], load)


def _published():
    now = datetime.now(UTC)
    # Rejalashtirilgan maqola vaqti kelganda avtomatik chiqadi (worker statusni ham yangilaydi)
    return or_(
        Post.status == PostStatus.published,
        (Post.status == PostStatus.scheduled) & (Post.published_at <= now),
    )


@router.get("/posts", response_model=s.PostPage)
async def posts(
    locale: LocaleQ,
    session: SessionDep,
    response: Response,
    category: Annotated[str | None, Query(max_length=80, pattern=r"^[a-z0-9-]+$")] = None,
    q: Annotated[str | None, Query(min_length=2, max_length=80)] = None,
    page: Annotated[int, Query(ge=1, le=500)] = 1,
    limit: Annotated[int, Query(ge=1, le=24)] = 9,
    featured: bool | None = None,
    exclude: Annotated[int | None, Query(ge=1)] = None,
):
    _cache_headers(response)

    async def load():
        base = select(Post).where(_published())
        if category:
            base = base.join(Post.category).where(PostCategory.slug == category)
        if featured is not None:
            base = base.where(Post.featured.is_(featured))
        if exclude:
            base = base.where(Post.id != exclude)
        if q:
            # Parametrlangan ILIKE; maxsus belgilar escape qilinadi
            like = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
            base = base.where(
                or_(
                    Post.title[locale].astext.ilike(like, escape="\\"),
                    Post.excerpt[locale].astext.ilike(like, escape="\\"),
                    Post.title["uz"].astext.ilike(like, escape="\\"),
                )
            )
        total = await session.scalar(select(func.count()).select_from(base.subquery())) or 0
        rows = (
            await session.scalars(
                base.order_by(Post.published_at.desc().nulls_last(), Post.id.desc()).offset((page - 1) * limit).limit(limit)
            )
        ).unique().all()
        return s.PostPage(
            items=[ser.post_card(p, locale) for p in rows],
            total=total,
            page=page,
            pages=max(1, math.ceil(total / limit)),
        ).model_dump(mode="json")

    key = f"posts:{locale}:{category}:{q}:{page}:{limit}:{featured}:{exclude}"
    # Qidiruv natijalari qisqa keshlanadi (kalitlar ko‘payib ketmasin)
    return await get_or_set(key, ["posts", "media"], load, ttl=120 if q else None)


@router.get("/posts/{slug}", response_model=s.PostOut)
async def post(slug: str, locale: LocaleQ, session: SessionDep, response: Response):
    if len(slug) > 120:
        raise HTTPException(404, "not_found")
    _cache_headers(response)

    async def load():
        p = await session.scalar(
            select(Post).where(Post.slug == slug, _published()).options(selectinload(Post.author))
        )
        return ser.post_full(p, locale).model_dump(mode="json") if p else None

    data = await get_or_set(f"post:{slug}:{locale}", [f"post:{slug}", "posts", "media"], load)
    if data is None:
        raise HTTPException(404, "not_found")
    return data


@router.get("/sitemap", response_model=s.SitemapOut)
async def sitemap(session: SessionDep, response: Response):
    _cache_headers(response)

    async def load():
        docs = (await session.execute(select(Doctor.slug, Doctor.updated_at).where(Doctor.is_published.is_(True)))).all()
        posts_ = (await session.execute(select(Post.slug, Post.updated_at).where(_published()))).all()
        return s.SitemapOut(
            doctors=[s.SitemapEntry(slug=a, updated_at=b) for a, b in docs],
            posts=[s.SitemapEntry(slug=a, updated_at=b) for a, b in posts_],
        ).model_dump(mode="json")

    return await get_or_set("sitemap", ["doctors", "posts"], load)
