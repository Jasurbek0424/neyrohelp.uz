"""Admin routerlari uchun umumiy yordamchilar: audit, 422, media, sahifalash."""

import math
import uuid
from collections.abc import Iterable
from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.i18n import completeness
from app.core.ratelimit import client_ip
from app.models import AuditLog, Media, User
from app.schemas.admin import AdminMedia, Completeness
from app.services.serialize import media_url


def audit(
    session: AsyncSession,
    request: Request | None,
    user: User | None,
    action: str,
    entity: str | None = None,
    entity_id: Any = None,
    meta: dict | None = None,
) -> None:
    """Audit yozuvi sessiyaga qo‘shiladi (commit chaqiruvchida)."""
    session.add(
        AuditLog(
            user_id=user.id if user else None,
            action=action,
            entity=entity,
            entity_id=str(entity_id) if entity_id is not None else None,
            meta=meta or {},
            ip=client_ip(request) if request else None,
        )
    )


def invalid(field: str | tuple, kind: str) -> RequestValidationError:
    """Biznes-validatsiya xatosi — kontraktdagi 422 formatida."""
    loc = ("body", *(field if isinstance(field, tuple) else (field,)))
    return RequestValidationError([{"loc": loc, "type": kind, "msg": kind}])


def not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, "not_found")


def patch_data(body: BaseModel, nullable: Iterable[str] = ()) -> dict[str, Any]:
    """PATCH: faqat yuborilgan maydonlar. Majburiy maydonga null yuborilsa — 422."""
    data = body.model_dump(exclude_unset=True)
    allowed_null = set(nullable)
    for key, value in data.items():
        if value is None and key not in allowed_null:
            raise invalid(key, "null_not_allowed")
    return data


def comp(*values: dict | None) -> Completeness:
    return Completeness(**completeness(*values))


def pages(total: int, limit: int) -> int:
    return max(1, math.ceil(total / limit))


def media_out(m: Media | None) -> AdminMedia | None:
    if not m:
        return None
    variants = m.variants or {}
    srcset = {k: media_url(v) for k, v in variants.items() if k != "original"}
    return AdminMedia(
        id=m.id,
        kind="document" if m.kind == "document" else "image",
        url=media_url(variants.get("original", "")),
        srcset=srcset,
        width=m.width,
        height=m.height,
        alt=m.alt or {},
        focal_x=m.focal_x,
        focal_y=m.focal_y,
        size=m.size,
        mime=m.mime,
    )


async def media_map(session: AsyncSession, ids: Iterable[Any]) -> dict[str, Media]:
    clean: set[uuid.UUID] = set()
    for i in ids:
        if not i:
            continue
        try:
            clean.add(i if isinstance(i, uuid.UUID) else uuid.UUID(str(i)))
        except ValueError:
            continue
    if not clean:
        return {}
    rows = (await session.scalars(select(Media).where(Media.id.in_(clean)))).all()
    return {str(m.id): m for m in rows}


async def require_media(session: AsyncSession, refs: dict[tuple, uuid.UUID | None], kind: str = "image") -> None:
    """Havola qilingan media mavjud va to‘g‘ri turda ekanini tekshiradi (aks holda 422)."""
    wanted = {loc: mid for loc, mid in refs.items() if mid}
    if not wanted:
        return
    found = await media_map(session, wanted.values())
    for loc, mid in wanted.items():
        m = found.get(str(mid))
        if not m or m.kind != kind:
            raise invalid(loc, "invalid_media")


async def ensure_slug_free(session: AsyncSession, model: Any, slug: str, exclude_id: Any = None) -> None:
    q = select(model.id).where(model.slug == slug)
    if exclude_id is not None:
        q = q.where(model.id != exclude_id)
    if await session.scalar(q.limit(1)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "slug_taken")


async def ensure_exists(session: AsyncSession, model: Any, obj_id: int | None, field: str) -> None:
    if obj_id is not None and await session.get(model, obj_id) is None:
        raise invalid(field, "not_found")


def conflict(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, detail)
