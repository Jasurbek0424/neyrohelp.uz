"""Sayt sozlamalari (admin, editor): site | home | clinic. Har kalit o‘z qat'iy sxemasi bilan."""

import uuid
from typing import Any, Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import ContentEditor, SessionDep
from app.core.revalidate import purge
from app.models import Setting, User
from app.schemas.admin import ClinicSettings, HomeSettings, LText, SiteSettings

from ._common import audit, media_map, media_out, require_media

router = APIRouter(prefix="/settings", tags=["admin:settings"])

Key = Literal["site", "home", "clinic"]
# public keshdagi teg: site → "settings" (public /site shu teg bilan keshlanadi)
PURGE: dict[str, list[str]] = {"site": ["settings"], "home": ["home"], "clinic": ["clinic"]}


def to_store(value: Any) -> Any:
    """Pydantic model → JSONB: LText'dan bo‘sh tillar olib tashlanadi, UUID → str."""
    if isinstance(value, LText):
        return value.store()
    if isinstance(value, BaseModel):
        return {name: to_store(getattr(value, name)) for name in type(value).model_fields}
    if isinstance(value, list):
        return [to_store(v) for v in value]
    if isinstance(value, uuid.UUID):
        return str(value)
    return value


def _collect_ids(value: Any) -> list[str]:
    if isinstance(value, dict):
        out: list[str] = []
        for k, v in value.items():
            if k.endswith("_id") and isinstance(v, str):
                out.append(v)
            else:
                out += _collect_ids(v)
        return out
    if isinstance(value, list):
        return [i for v in value for i in _collect_ids(v)]
    return []


def _resolve(value: Any, media: dict) -> Any:
    """Har `<x>_id` yoniga yechilgan `<x>` (Media | null) qo‘shiladi."""
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            out[k] = _resolve(v, media)
            if k.endswith("_id"):
                m = media_out(media.get(str(v))) if v else None
                out[k[:-3]] = m.model_dump(mode="json") if m else None
        return out
    if isinstance(value, list):
        return [_resolve(v, media) for v in value]
    return value


async def _out(session: AsyncSession, value: dict) -> dict[str, Any]:
    media = await media_map(session, _collect_ids(value))
    return _resolve(value, media)


async def _save(session: AsyncSession, request: Request, user: User, key: str, body: BaseModel) -> dict[str, Any]:
    value = to_store(body)
    row = await session.get(Setting, key)
    if row:
        row.value = value
    else:
        session.add(Setting(key=key, value=value))
    audit(session, request, user, "settings_update", "settings", key)
    await session.commit()
    await purge(PURGE[key])
    return await _out(session, value)


@router.get("/{key}", response_model=dict[str, Any])
async def get_settings(key: Key, user: ContentEditor, session: SessionDep):
    row = await session.get(Setting, key)
    return await _out(session, row.value if row else {})


@router.put("/site", response_model=dict[str, Any])
async def put_site(body: SiteSettings, request: Request, user: ContentEditor, session: SessionDep):
    return await _save(session, request, user, "site", body)


@router.put("/home", response_model=dict[str, Any])
async def put_home(body: HomeSettings, request: Request, user: ContentEditor, session: SessionDep):
    refs = {("hero_images", i, "image_id"): x.image_id for i, x in enumerate(body.hero_images)}
    refs[("clinic_image_id",)] = body.clinic_image_id
    await require_media(session, refs)
    return await _save(session, request, user, "home", body)


@router.put("/clinic", response_model=dict[str, Any])
async def put_clinic(body: ClinicSettings, request: Request, user: ContentEditor, session: SessionDep):
    images = {("equipment", i, "image_id"): x.image_id for i, x in enumerate(body.equipment)}
    images[("cover_id",)] = body.cover_id
    await require_media(session, images)
    await require_media(session, {("documents", i, "file_id"): x.file_id for i, x in enumerate(body.documents)}, "document")
    return await _save(session, request, user, "clinic", body)
