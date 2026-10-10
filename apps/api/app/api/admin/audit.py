"""Audit log (faqat admin)."""

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.core.deps import AdminOnly, SessionDep
from app.models import AuditLog, User
from app.schemas.admin import AuditOut, Page

from ._common import pages

router = APIRouter(prefix="/audit", tags=["admin:system"])


@router.get("", response_model=Page[AuditOut])
async def list_audit(
    user: AdminOnly,
    session: SessionDep,
    action: Annotated[str | None, Query(max_length=64, pattern=r"^[a-z_]+$")] = None,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    conds = [AuditLog.action == action] if action else []
    total = await session.scalar(select(func.count()).select_from(AuditLog).where(*conds)) or 0
    rows = (
        await session.execute(
            select(AuditLog, User.name)
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
            user_name=name,
            action=a.action,
            entity=a.entity,
            entity_id=a.entity_id,
            meta=a.meta or {},
            ip=str(a.ip) if a.ip is not None else None,
            created_at=a.created_at,
        )
        for a, name in rows
    ]
    return Page[AuditOut](items=items, total=total, page=page, pages=pages(total, limit))
