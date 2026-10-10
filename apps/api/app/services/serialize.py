"""ORM obyektlarini tanlangan tildagi public javoblarga aylantirish."""

from app.core.config import settings
from app.core.i18n import Locale, t
from app.models import Doctor, Media, Post, ServiceCategory, Specialty
from app.schemas import public as s


def media_url(path: str) -> str:
    return f"{settings.media_url}/{path}"


def media_out(m: Media | None, locale: Locale) -> s.MediaOut | None:
    if not m:
        return None
    variants = {k: media_url(v) for k, v in (m.variants or {}).items() if k != "original"}
    largest = max(variants, key=lambda k: int(k), default=None) if variants else None
    url = variants[largest] if largest else media_url(m.variants.get("original", ""))
    return s.MediaOut(
        id=str(m.id),
        url=url,
        width=m.width,
        height=m.height,
        alt=t(m.alt, locale),
        focal_x=m.focal_x,
        focal_y=m.focal_y,
        srcset=variants,
    )


def specialty_out(sp: Specialty, locale: Locale) -> s.SpecialtyOut:
    return s.SpecialtyOut(id=sp.id, slug=sp.slug, title=t(sp.title, locale))


def doctor_card(d: Doctor, locale: Locale) -> s.DoctorCardOut:
    return s.DoctorCardOut(
        id=d.id,
        slug=d.slug,
        full_name=d.full_name,
        specialty=specialty_out(d.specialty, locale),
        audience=d.audience.value,
        photo=media_out(d.photo, locale),
        experience_years=d.experience_years,
    )


def doctor_full(d: Doctor, locale: Locale, media_by_id: dict[str, Media]) -> s.DoctorOut:
    timeline = lambda rows: [  # noqa: E731
        s.TimelineRow(years=r.get("years", ""), place=t(r.get("place"), locale), detail=t(r.get("detail"), locale))
        for r in rows or []
    ]
    return s.DoctorOut(
        **doctor_card(d, locale).model_dump(),
        lead=t(d.lead, locale),
        qualification=t(d.qualification, locale),
        price=d.price,
        languages=t(d.languages, locale),
        work_days=list(d.work_days or []),
        education=timeline(d.education),
        career=timeline(d.career),
        certificates=[
            s.CertificateRow(
                title=t(c.get("title"), locale),
                year=c.get("year", ""),
                image=media_out(media_by_id.get(str(c.get("image_id"))), locale),
            )
            for c in d.certificates or []
        ],
        seo=s.SeoOut(title=t((d.seo or {}).get("title"), locale), description=t((d.seo or {}).get("description"), locale)),
        updated_at=d.updated_at,
    )


def group_out(c: ServiceCategory, locale: Locale) -> s.ServiceGroupOut:
    return s.ServiceGroupOut(
        id=c.id,
        slug=c.slug,
        title=t(c.title, locale),
        summary=t(c.summary, locale),
        description=t(c.description, locale),
        show_on_home=c.show_on_home,
        services=[
            s.ServiceOut(
                id=x.id,
                title=t(x.title, locale),
                note=t(x.note, locale),
                duration_minutes=x.duration_minutes,
                price=x.price,
                price_from=x.price_from,
            )
            for x in c.services
            if x.is_active
        ],
    )


def author_out(d: Doctor | None, locale: Locale) -> s.AuthorOut | None:
    if not d:
        return None
    return s.AuthorOut(
        slug=d.slug,
        full_name=d.full_name,
        specialty=t(d.specialty.title, locale) if d.specialty else "",
        lead=t(d.lead, locale),
        photo=media_out(d.photo, locale),
    )


def post_card(p: Post, locale: Locale) -> s.PostCardOut:
    return s.PostCardOut(
        id=p.id,
        slug=p.slug,
        title=t(p.title, locale),
        excerpt=t(p.excerpt, locale),
        cover=media_out(p.cover, locale),
        category=s.PostCategoryOut(id=p.category.id, slug=p.category.slug, title=t(p.category.title, locale)),
        author=author_out(p.author, locale),
        reading_minutes=p.reading_minutes,
        published_at=p.published_at,
        featured=p.featured,
    )


def post_full(p: Post, locale: Locale) -> s.PostOut:
    return s.PostOut(
        **post_card(p, locale).model_dump(),
        body=t(p.body, locale),
        seo=s.SeoOut(title=t((p.seo or {}).get("title"), locale), description=t((p.seo or {}).get("description"), locale)),
        updated_at=p.updated_at,
        translated=bool((p.body or {}).get(locale)),
    )
