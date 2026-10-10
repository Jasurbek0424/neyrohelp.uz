"""Mutaxassisliklar (admin, editor)."""

from fastapi import APIRouter, Request, Response, status
from sqlalchemy import func, select

from app.core.deps import ContentEditor, SessionDep
from app.core.revalidate import purge
from app.models import Doctor, Specialty
from app.schemas.admin import AdminSpecialty, SpecialtyIn, SpecialtyPatch

from ._common import audit, conflict, ensure_slug_free, not_found, patch_data

router = APIRouter(prefix="/specialties", tags=["admin:content"])
# Mutaxassislik nomi shifokor kartalarida va maqola muallifida ko‘rinadi
TAGS = ["doctors", "posts"]


@router.get("", response_model=list[AdminSpecialty])
async def list_specialties(user: ContentEditor, session: SessionDep):
    rows = (await session.scalars(select(Specialty).order_by(Specialty.order, Specialty.id))).all()
    return [AdminSpecialty.model_validate(x) for x in rows]


@router.post("", response_model=AdminSpecialty, status_code=status.HTTP_201_CREATED)
async def create_specialty(body: SpecialtyIn, user: ContentEditor, session: SessionDep):
    await ensure_slug_free(session, Specialty, body.slug)
    obj = Specialty(slug=body.slug, title=body.title.store(), order=body.order)
    session.add(obj)
    await session.commit()
    await purge(TAGS)
    return AdminSpecialty.model_validate(obj)


@router.patch("/{item_id}", response_model=AdminSpecialty)
async def patch_specialty(item_id: int, body: SpecialtyPatch, user: ContentEditor, session: SessionDep):
    obj = await session.get(Specialty, item_id)
    if not obj:
        raise not_found()
    data = patch_data(body)
    if "slug" in data:
        await ensure_slug_free(session, Specialty, data["slug"], item_id)
        obj.slug = data["slug"]
    if body.title is not None:
        obj.title = body.title.store()
    if "order" in data:
        obj.order = data["order"]
    await session.commit()
    await purge(TAGS)
    return AdminSpecialty.model_validate(obj)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_specialty(item_id: int, request: Request, user: ContentEditor, session: SessionDep):
    obj = await session.get(Specialty, item_id)
    if not obj:
        raise not_found()
    used = await session.scalar(select(func.count()).select_from(Doctor).where(Doctor.specialty_id == item_id))
    if used:
        raise conflict("in_use")
    audit(session, request, user, "specialty_delete", "specialty", item_id, {"slug": obj.slug})
    await session.delete(obj)
    await session.commit()
    await purge(TAGS)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
