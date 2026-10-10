"""Audit log (faqat admin): kim, qachon, nima qildi. Filtr: xodim, sana oralig‘i, amal guruhi."""

from datetime import date, datetime, time, timedelta
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.core.deps import AdminOnly, SessionDep
from app.models import AuditLog, User
from app.schemas.admin import AuditOut, Page

from ._common import pages

router = APIRouter(prefix="/audit", tags=["admin:system"])
TZ = ZoneInfo("Asia/Tashkent")

Group = Literal["auth", "leads", "content", "prices", "users"]
GROUPS: dict[str, tuple[str, ...]] = {
    "auth": ("login_success", "login_failed", "logout", "refresh_reuse", "password_changed", "password_change_failed"),
    "leads": ("lead_take", "lead_status", "lead_note", "leads_export"),
    "prices": ("price_change",),
    "users": ("user_create", "user_update", "role_change", "password_reset", "sessions_revoked", "2fa_reset_cli"),
    "content": (
        "doctor_delete",
        "media_delete",
        "post_delete",
        "post_category_delete",
        "service_delete",
        "specialty_delete",
        "settings_update",
    ),
}


def _start(d: date) -> datetime:
    return datetime.combine(d, time.min, TZ)


@router.get("", response_model=Page[AuditOut])
async def list_audit(
    user: AdminOnly,
    session: SessionDep,
    action: Annotated[str | None, Query(max_length=64, pattern=r"^[a-z0-9_]+$")] = None,
    group: Group | None = None,
    user_id: Annotated[int | None, Query(ge=1)] = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    conds = []
    if action:
        conds.append(AuditLog.action == action)
    if group:
        conds.append(AuditLog.action.in_(GROUPS[group]))
    if user_id:
        conds.append(AuditLog.user_id == user_id)
    if date_from:
        conds.append(AuditLog.created_at >= _start(date_from))
    if date_to:
        conds.append(AuditLog.created_at < _start(date_to + timedelta(days=1)))

    total = await session.scalar(select(func.count()).select_from(AuditLog).where(*conds)) or 0
    rows = (
        await session.execute(
            select(AuditLog, User.name, User.role)
            .outerjoin(User, User.id == AuditLog.user_id)
            .where(*conds)
            .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    items = [
        AuditOut(
            id=a.id,
            user_id=a.user_id,
            user_name=name,
            user_role=role,
            action=a.action,
            entity=a.entity,
            entity_id=a.entity_id,
            meta=a.meta or {},
            ip=str(a.ip) if a.ip is not None else None,
            created_at=a.created_at,
        )
        for a, name, role in rows
    ]
    return Page[AuditOut](items=items, total=total, page=page, pages=pages(total, limit))
