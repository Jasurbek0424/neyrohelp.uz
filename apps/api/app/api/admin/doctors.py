"""Shifokorlar (admin, editor)."""

import uuid
from typing import Any

from fastapi import APIRouter, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import ContentEditor, SessionDep
from app.core.i18n import t
from app.core.revalidate import purge
from app.models import Doctor, Specialty
from app.schemas.admin import (
    AdminSeo,
    CertificateIn,
    CertificateOut,
    DoctorAdmin,
    DoctorIn,
    DoctorListItem,
    DoctorPatch,
    SeoIn,
    TimelineIn,
    TimelineOut,
    lt,
)

from ._common import (
    audit,
    comp,
    ensure_exists,
    ensure_slug_free,
    media_map,
    media_out,
    not_found,
    patch_data,
    require_media,
)

router = APIRouter(prefix="/doctors", tags=["admin:content"])

LTEXT_FIELDS = ("lead", "qualification", "languages")


def _timeline(rows: list[TimelineIn]) -> list[dict]:
    return [{"years": r.years, "place": lt(r.place), "detail": lt(r.detail)} for r in rows]


def _certs(rows: list[CertificateIn]) -> list[dict]:
    return [{"title": lt(c.title), "year": c.year, "image_id": str(c.image_id) if c.image_id else None} for c in rows]


def _seo(seo: SeoIn) -> dict:
    return {"title": lt(seo.title), "description": lt(seo.description)}


def _completeness(d: Doctor):
    return comp(d.lead, d.qualification)


async def _load(session: AsyncSession, doctor_id: int) -> Doctor:
    d = await session.scalar(
        select(Doctor).where(Doctor.id == doctor_id).execution_options(populate_existing=True)
    )
    if not d:
        raise not_found()
    return d


def _uuid(value: Any) -> uuid.UUID | None:
    try:
        return uuid.UUID(str(value)) if value else None
    except ValueError:
        return None


async def doctor_admin(session: AsyncSession, d: Doctor) -> DoctorAdmin:
    media = await media_map(session, [c.get("image_id") for c in d.certificates or []])
    seo = d.seo or {}
    return DoctorAdmin(
        id=d.id,
        slug=d.slug,
        full_name=d.full_name,
        specialty_id=d.specialty_id,
        audience=d.audience,
        photo_id=d.photo_id,
        photo=media_out(d.photo),
        lead=d.lead or {},
        experience_years=d.experience_years,
        qualification=d.qualification or {},
        price=d.price,
        languages=d.languages or {},
        work_days=list(d.work_days or []),
        education=[TimelineOut(**r) for r in d.education or []],
        career=[TimelineOut(**r) for r in d.career or []],
        certificates=[
            CertificateOut(
                title=c.get("title") or {},
                year=c.get("year") or "",
                image_id=_uuid(c.get("image_id")),
                image=media_out(media.get(str(c.get("image_id")))),
            )
            for c in d.certificates or []
        ],
        seo=AdminSeo(title=seo.get("title") or {}, description=seo.get("description") or {}),
        order=d.order,
        show_on_home=d.show_on_home,
        is_published=d.is_published,
        completeness=_completeness(d),
        updated_at=d.updated_at,
    )


async def _validate_refs(session: AsyncSession, data: dict, certificates: list[CertificateIn] | None) -> None:
    if "specialty_id" in data:
        await ensure_exists(session, Specialty, data["specialty_id"], "specialty_id")
    refs: dict[tuple, uuid.UUID | None] = {}
    if data.get("photo_id"):
        refs[("photo_id",)] = data["photo_id"]
    for i, c in enumerate(certificates or []):
        refs[("certificates", i, "image_id")] = c.image_id
    await require_media(session, refs)


def _apply(d: Doctor, body: DoctorIn | DoctorPatch, data: dict) -> None:
    for key in ("slug", "full_name", "specialty_id", "audience", "photo_id", "experience_years", "price", "order",
                "show_on_home", "is_published", "work_days"):
        if key in data:
            setattr(d, key, data[key])
    for key in LTEXT_FIELDS:
        if key in data:
            setattr(d, key, lt(getattr(body, key)))
    if "education" in data:
        d.education = _timeline(body.education or [])
    if "career" in data:
        d.career = _timeline(body.career or [])
    if "certificates" in data:
        d.certificates = _certs(body.certificates or [])
    if "seo" in data:
        d.seo = _seo(body.seo or SeoIn())


def _tags(*slugs: str) -> list[str]:
    # Muallif sifatida maqolalarda ham ko‘rinadi
    return ["doctors", "posts", *{f"doctor:{s}" for s in slugs}]


@router.get("", response_model=list[DoctorListItem])
async def list_doctors(user: ContentEditor, session: SessionDep):
    rows = (await session.scalars(select(Doctor).order_by(Doctor.order, Doctor.id))).unique().all()
    return [
        DoctorListItem(
            id=d.id,
            slug=d.slug,
            full_name=d.full_name,
            specialty_id=d.specialty_id,
            specialty_title=t(d.specialty.title, "uz") if d.specialty else "",
            audience=d.audience,
            photo=media_out(d.photo),
            experience_years=d.experience_years,
            order=d.order,
            show_on_home=d.show_on_home,
            is_published=d.is_published,
            completeness=_completeness(d),
        )
        for d in rows
    ]


@router.get("/{doctor_id}", response_model=DoctorAdmin)
async def get_doctor(doctor_id: int, user: ContentEditor, session: SessionDep):
    return await doctor_admin(session, await _load(session, doctor_id))


@router.post("", response_model=DoctorAdmin, status_code=status.HTTP_201_CREATED)
async def create_doctor(body: DoctorIn, request: Request, user: ContentEditor, session: SessionDep):
    data = body.model_dump()
    await ensure_slug_free(session, Doctor, body.slug)
    await _validate_refs(session, data, body.certificates)
    d = Doctor()
    _apply(d, body, data)
    session.add(d)
    await session.flush()
    if d.price is not None:
        audit(session, request, user, "price_change", "doctor", d.id, {"old": None, "new": d.price})
    await session.commit()
    await purge(_tags(d.slug))
    return await doctor_admin(session, await _load(session, d.id))


@router.patch("/{doctor_id}", response_model=DoctorAdmin)
async def patch_doctor(doctor_id: int, body: DoctorPatch, request: Request, user: ContentEditor, session: SessionDep):
    d = await _load(session, doctor_id)
    data = patch_data(body, nullable={"photo_id", "experience_years", "price"})
    old_slug, old_price = d.slug, d.price
    if "slug" in data:
        await ensure_slug_free(session, Doctor, data["slug"], doctor_id)
    await _validate_refs(session, data, body.certificates)
    _apply(d, body, data)
    if "price" in data and data["price"] != old_price:
        audit(session, request, user, "price_change", "doctor", d.id, {"old": old_price, "new": data["price"]})
    await session.commit()
    await purge(_tags(old_slug, d.slug))
    return await doctor_admin(session, await _load(session, doctor_id))


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_doctor(doctor_id: int, request: Request, user: ContentEditor, session: SessionDep):
    d = await _load(session, doctor_id)
    slug = d.slug
    audit(session, request, user, "doctor_delete", "doctor", doctor_id, {"slug": slug, "full_name": d.full_name})
    await session.delete(d)
    await session.commit()
    await purge(_tags(slug))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
