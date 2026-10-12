"""Arizalar (admin, operator). Eksport — faqat admin."""

import io
import logging
import re
from collections.abc import AsyncIterator
from datetime import UTC, date, datetime, time, timedelta
from time import monotonic
from typing import Annotated, Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import SessionLocal
from app.core.deps import AdminOnly, LeadOperator, SessionDep, current_user, totp_required
from app.core.redis import redis
from app.core.security import ACCESS_COOKIE, decode_access_token
from app.core.shutdown import stopping
from app.models import Lead, LeadEvent, LeadStatus, Role
from app.schemas.admin import LeadCounts, LeadDetail, LeadPage, LeadPatch, LeadRow
from app.services import lead_events, telegram
from app.services.telegram import STATUS_TEXT

from ._common import audit, not_found, pages, patch_data

log = logging.getLogger(__name__)
router = APIRouter(prefix="/leads", tags=["admin:leads"])
TZ = ZoneInfo("Asia/Tashkent")
EXPORT_MAX_ROWS = 50_000
_NON_DIGIT = re.compile(r"\D")


def _like(q: str) -> str:
    return "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


def _filters(
    q: str | None,
    date_from: date | None,
    date_to: date | None,
    taken_by: str | None = None,
) -> list[ColumnElement[bool]]:
    conds: list[ColumnElement[bool]] = []
    if q:
        options: list[ColumnElement[bool]] = [Lead.full_name.ilike(_like(q), escape="\\")]
        digits = _NON_DIGIT.sub("", q)
        if len(digits) >= 3:
            options.append(Lead.phone.contains(digits, autoescape=True))
        conds.append(or_(*options))
    if date_from:
        conds.append(Lead.created_at >= datetime.combine(date_from, time.min, tzinfo=TZ))
    if date_to:
        conds.append(Lead.created_at < datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=TZ))
    if taken_by:
        conds.append(Lead.taken_by == taken_by)
    return conds


async def load_detail(session: AsyncSession, lead_id: int) -> LeadDetail:
    lead = await session.scalar(
        select(Lead)
        .where(Lead.id == lead_id)
        .options(selectinload(Lead.events))
        .execution_options(populate_existing=True)
    )
    if not lead:
        raise not_found()
    return LeadDetail.model_validate(lead)


async def _sync_telegram(lead: Lead) -> None:
    """Telegram xabari yangilanadi; xato bo‘lsa ham API muvaffaqiyatli javob beradi."""
    try:
        await telegram.sync(lead)
    except Exception:
        log.warning("telegram sync failed for lead %s", lead.id, exc_info=True)


@router.get("", response_model=LeadPage)
async def list_leads(
    user: LeadOperator,
    session: SessionDep,
    status_: Annotated[LeadStatus | None, Query(alias="status")] = None,
    q: Annotated[str | None, Query(min_length=1, max_length=80)] = None,
    date_from: date | None = None,
    date_to: date | None = None,
    taken_by: Annotated[str | None, Query(max_length=120)] = None,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    conds = _filters(q, date_from, date_to, taken_by)

    count_rows = (await session.execute(select(Lead.status, func.count()).where(*conds).group_by(Lead.status))).all()
    counts: dict[str, int] = {s.value if isinstance(s, LeadStatus) else str(s): int(n) for s, n in count_rows}
    counts["all"] = sum(counts.values())

    where = [*conds, Lead.status == status_] if status_ else conds
    total = counts.get(status_.value, 0) if status_ else counts["all"]
    rows = (
        await session.scalars(
            select(Lead).where(*where).order_by(Lead.created_at.desc(), Lead.id.desc()).offset((page - 1) * limit).limit(limit)
        )
    ).all()
    return LeadPage(
        items=[LeadRow.model_validate(x) for x in rows],
        total=total,
        page=page,
        pages=pages(total, limit),
        counts=LeadCounts(**counts),
    )


def _cell(value: Any) -> Any:
    """Formula injection'dan himoya: = + - @ (va tab/CR) bilan boshlangan matnga ' prefiks."""
    if isinstance(value, str) and value and value[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


def _local(dt: datetime | None) -> str:
    return dt.astimezone(TZ).strftime("%Y-%m-%d %H:%M") if dt else ""


def build_xlsx(leads: list[Lead]) -> bytes:
    wb = Workbook(write_only=True)
    ws = wb.create_sheet("Arizalar")
    ws.append(["ID", "Sana", "F.I.O.", "Telefon", "Shikoyat", "Status", "Kim oldi", "Olingan vaqt", "Izoh", "Sahifa", "Til"])
    for x in leads:
        ws.append(
            [
                _cell(v)
                for v in (
                    x.id,
                    _local(x.created_at),
                    x.full_name,
                    x.phone,
                    x.message or "",
                    STATUS_TEXT.get(x.status, str(x.status)),
                    x.taken_by or "",
                    _local(x.taken_at),
                    x.admin_note or "",
                    x.page or "",
                    x.locale,
                )
            ]
        )
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@router.get("/export", response_class=Response, responses={200: {"content": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {}}}})
async def export_leads(
    request: Request,
    user: AdminOnly,
    session: SessionDep,
    status_: Annotated[LeadStatus | None, Query(alias="status")] = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    conds = _filters(None, date_from, date_to)
    if status_:
        conds.append(Lead.status == status_)
    rows = list(
        (
            await session.scalars(
                select(Lead).where(*conds).order_by(Lead.created_at.desc()).limit(EXPORT_MAX_ROWS)
            )
        ).all()
    )
    data = await run_in_threadpool(build_xlsx, rows)
    audit(
        session,
        request,
        user,
        "leads_export",
        "lead",
        meta={
            "status": status_.value if status_ else None,
            "date_from": date_from.isoformat() if date_from else None,
            "date_to": date_to.isoformat() if date_to else None,
            "rows": len(rows),
        },
    )
    await session.commit()
    stamp = datetime.now(UTC).astimezone(TZ).strftime("%Y%m%d-%H%M")
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="arizalar-{stamp}.xlsx"'},
    )


SSE_PING_SECONDS = 20


async def _lead_stream(request: Request, deadline: float) -> AsyncIterator[str]:
    pubsub = redis.pubsub()
    try:
        await pubsub.subscribe(lead_events.CHANNEL)
    except Exception:
        log.warning("lead events subscribe failed", exc_info=True)
        return  # mijoz zaxira polling'ga o‘tadi
    try:
        yield "retry: 5000\n\n"
        last = monotonic()
        # Access token tugaguncha: keyin oqim yopiladi, panel sessiyani yangilab qayta ulanadi.
        # Server to‘xtasa ham darhol yopiladi — aks holda reload/deploy ulanish yopilishini kutib qoladi
        while not stopping.is_set() and datetime.now(UTC).timestamp() < deadline:
            if await request.is_disconnected():
                break
            msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if msg:
                yield f"event: lead\ndata: {msg['data']}\n\n"
                last = monotonic()
            elif monotonic() - last >= SSE_PING_SECONDS:
                yield ": ping\n\n"  # proksi va brauzer ulanishni o‘lik deb yopmasin
                last = monotonic()
    except Exception:
        log.warning("lead events stream failed", exc_info=True)
    finally:
        try:
            await pubsub.aclose()
        except Exception:
            log.debug("pubsub close failed", exc_info=True)


@router.get("/events", include_in_schema=False)
async def lead_events_stream(request: Request):
    """SSE: ariza yaratildi/o‘zgardi signali. SessionDep ishlatilmaydi — DB ulanishi oqim davomida band bo‘lmasin."""
    async with SessionLocal() as session:
        user = await current_user(request, session)
    if user.role not in (Role.admin, Role.operator):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    if totp_required(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "totp_required")
    token = decode_access_token(request.cookies.get(ACCESS_COOKIE, "")) or {}
    return StreamingResponse(
        _lead_stream(request, float(token.get("exp", 0))),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"},  # Cache-Control: main.py → SecurityHeaders
    )


@router.get("/{lead_id}", response_model=LeadDetail)
async def get_lead(lead_id: int, user: LeadOperator, session: SessionDep):
    return await load_detail(session, lead_id)


@router.post("/{lead_id}/take", response_model=LeadDetail)
async def take_lead(lead_id: int, request: Request, user: LeadOperator, session: SessionDep):
    # SELECT ... FOR UPDATE: admin panel va Telegram bir vaqtda olsa ham faqat bittasi muvaffaqiyatli
    lead = await session.scalar(select(Lead).where(Lead.id == lead_id).with_for_update())
    if not lead:
        raise not_found()
    if lead.status != LeadStatus.new:
        raise HTTPException(status.HTTP_409_CONFLICT, "already_taken")
    lead.status = LeadStatus.in_progress
    lead.taken_by = user.name
    lead.taken_by_user_id = user.id
    lead.taken_at = datetime.now(UTC)
    session.add(LeadEvent(lead_id=lead.id, kind="taken", actor=user.name, meta={"via": "admin"}))
    audit(session, request, user, "lead_take", "lead", lead.id)
    await session.commit()
    await lead_events.publish(lead.id, "updated")
    await _sync_telegram(lead)
    return await load_detail(session, lead_id)


@router.patch("/{lead_id}", response_model=LeadDetail)
async def patch_lead(lead_id: int, body: LeadPatch, request: Request, user: LeadOperator, session: SessionDep):
    data = patch_data(body, nullable={"admin_note"})
    lead = await session.scalar(select(Lead).where(Lead.id == lead_id).with_for_update())
    if not lead:
        raise not_found()

    changed = False
    new_status: LeadStatus | None = data.get("status")
    if new_status is not None and new_status != lead.status:
        old = lead.status
        lead.status = new_status
        if new_status == LeadStatus.new:
            # Qayta «yangi» — Telegramda yana «Men oldim» tugmasi chiqadi
            lead.taken_by = lead.taken_at = lead.taken_by_user_id = None
        elif not lead.taken_by:
            lead.taken_by, lead.taken_by_user_id, lead.taken_at = user.name, user.id, datetime.now(UTC)
        session.add(
            LeadEvent(
                lead_id=lead.id, kind="status", actor=user.name, meta={"status": new_status.value, "from": old.value}
            )
        )
        audit(session, request, user, "lead_status", "lead", lead.id, {"from": old.value, "to": new_status.value})
        changed = True

    if "admin_note" in data:
        note = (data["admin_note"] or "").strip() or None
        if note != lead.admin_note:
            lead.admin_note = note
            session.add(LeadEvent(lead_id=lead.id, kind="note", actor=user.name, meta={"length": len(note or "")}))
            audit(session, request, user, "lead_note", "lead", lead.id)
            changed = True

    await session.commit()
    if changed:
        await lead_events.publish(lead.id, "updated")
        await _sync_telegram(lead)
    return await load_detail(session, lead_id)
