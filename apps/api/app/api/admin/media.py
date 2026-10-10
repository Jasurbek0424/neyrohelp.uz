"""Media kutubxonasi (admin, editor): yuklash, ro‘yxat, alt/fokus, o‘chirish."""

import logging
import uuid
from typing import Annotated, Any, Literal

from fastapi import APIRouter, File, Form, Query, Request, Response, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import ContentEditor, SessionDep
from app.core.revalidate import purge
from app.models import Doctor, Media, Post, Setting
from app.schemas.admin import AdminMedia, MediaPatch, Page
from app.services import media as media_svc

from ._common import audit, conflict, media_out, not_found, pages, patch_data

log = logging.getLogger(__name__)
router = APIRouter(prefix="/media", tags=["admin:media"])
TAGS = ["media"]


@router.post("", response_model=AdminMedia, status_code=status.HTTP_201_CREATED)
async def upload(
    request: Request,
    user: ContentEditor,
    session: SessionDep,
    file: Annotated[UploadFile, File()],
    alt_uz: Annotated[str | None, Form(max_length=300)] = None,
):
    data = await media_svc.read_limited(file)
    if not data:
        raise media_svc.unsupported()
    file_id = uuid.uuid4()
    stored = await run_in_threadpool(media_svc.process, data, file_id)
    alt = alt_uz.strip() if alt_uz else ""
    m = Media(
        id=file_id,
        kind=stored.kind,
        mime=stored.mime,
        width=stored.width,
        height=stored.height,
        size=stored.size,
        variants=stored.variants,
        alt={"uz": alt} if alt else {},
        uploaded_by=user.id,
    )
    session.add(m)
    try:
        await session.commit()
    except Exception:
        media_svc.delete_files(stored.variants)
        raise
    return media_out(m)


@router.get("", response_model=Page[AdminMedia])
async def list_media(
    user: ContentEditor,
    session: SessionDep,
    kind: Literal["image", "document"] | None = None,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 40,
):
    conds = [Media.kind == kind] if kind else []
    total = await session.scalar(select(func.count()).select_from(Media).where(*conds)) or 0
    rows = (
        await session.scalars(
            select(Media).where(*conds).order_by(Media.created_at.desc()).offset((page - 1) * limit).limit(limit)
        )
    ).all()
    return Page[AdminMedia](items=[media_out(m) for m in rows], total=total, page=page, pages=pages(total, limit))


@router.patch("/{media_id}", response_model=AdminMedia)
async def patch_media(media_id: uuid.UUID, body: MediaPatch, user: ContentEditor, session: SessionDep):
    m = await session.get(Media, media_id)
    if not m:
        raise not_found()
    data = patch_data(body)
    if body.alt is not None:
        m.alt = body.alt.store()
    if "focal_x" in data:
        m.focal_x = data["focal_x"]
    if "focal_y" in data:
        m.focal_y = data["focal_y"]
    await session.commit()
    await purge(TAGS)
    return media_out(m)


def _refs_in(value: Any, target: str) -> bool:
    """Sozlamalar ichida istalgan chuqurlikdagi *_id kalitlarida shu media bormi."""
    if isinstance(value, dict):
        return any(
            (k.endswith("_id") and str(v) == target) or _refs_in(v, target) for k, v in value.items()
        )
    if isinstance(value, list):
        return any(_refs_in(v, target) for v in value)
    return False


async def in_use(session: AsyncSession, media_id: uuid.UUID) -> bool:
    if await session.scalar(select(Doctor.id).where(Doctor.photo_id == media_id).limit(1)):
        return True
    if await session.scalar(select(Post.id).where(Post.cover_id == media_id).limit(1)):
        return True
    cert = select(Doctor.id).where(Doctor.certificates.contains([{"image_id": str(media_id)}])).limit(1)
    if await session.scalar(cert):
        return True
    settings_rows = (await session.scalars(select(Setting))).all()
    return any(_refs_in(s.value, str(media_id)) for s in settings_rows)


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(media_id: uuid.UUID, request: Request, user: ContentEditor, session: SessionDep):
    m = await session.get(Media, media_id, with_for_update=True)
    if not m:
        raise not_found()
    if await in_use(session, media_id):
        raise conflict("in_use")
    variants = dict(m.variants or {})
    audit(session, request, user, "media_delete", "media", media_id, {"kind": m.kind, "size": m.size})
    await session.delete(m)
    await session.commit()
    try:
        await run_in_threadpool(media_svc.delete_files, variants)
    except OSError:
        log.warning("media files delete failed for %s", media_id, exc_info=True)
    await purge(TAGS)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

