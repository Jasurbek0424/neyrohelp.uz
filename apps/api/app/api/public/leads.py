from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.core.config import settings
from app.core.deps import SessionDep
from app.core.ratelimit import client_ip, enforce
from app.core.security import constant_eq
from app.models import Lead, LeadEvent
from app.schemas.public import LeadAccepted, LeadIn
from app.services import telegram
from app.services.phone import normalize_uz_phone

router = APIRouter(tags=["public"])

DEDUP_WINDOW = timedelta(minutes=10)


@router.post("/public/leads", response_model=LeadAccepted, status_code=status.HTTP_201_CREATED)
async def create_lead(body: LeadIn, request: Request, session: SessionDep):
    # Bot tuzoqlari: botga «muvaffaqiyat» qaytaramiz, lekin hech narsa saqlamaymiz
    if body.website or (body.elapsed_ms is not None and body.elapsed_ms < 2000):
        return LeadAccepted()

    ip = client_ip(request)
    await enforce(f"lead:ip:{ip}", limit=5, window_seconds=600)

    phone = normalize_uz_phone(body.phone)
    if not phone:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "invalid_phone")
    await enforce(f"lead:phone:{phone}", limit=3, window_seconds=3600)

    since = datetime.now(UTC) - DEDUP_WINDOW
    existing = await session.scalar(
        select(Lead).where(Lead.phone == phone, Lead.created_at >= since).order_by(Lead.id.desc()).limit(1)
    )
    if existing:
        if body.message and body.message != existing.message:
            existing.message = "\n—\n".join(x for x in (existing.message, body.message) if x)[:4000]
            session.add(LeadEvent(lead_id=existing.id, kind="duplicate", meta={"page": body.page}))
            await session.commit()
        return LeadAccepted()

    lead = Lead(
        full_name=body.full_name,
        phone=phone,
        message=body.message or None,
        page=body.page,
        locale=body.locale,
        consent=True,
    )
    session.add(lead)
    await session.flush()
    session.add(LeadEvent(lead_id=lead.id, kind="created", meta={"page": body.page, "locale": body.locale}))
    await session.commit()

    # Javob darhol qaytadi; Telegramga yuborishni worker bajaradi (retry bilan)
    arq = getattr(request.app.state, "arq", None)
    if arq is not None:
        await arq.enqueue_job("deliver_lead", lead.id, _job_id=f"lead:{lead.id}")
    return LeadAccepted()


@router.post("/telegram/webhook", include_in_schema=False)
async def telegram_webhook(request: Request, session: SessionDep):
    secret = settings.telegram_webhook_secret.get_secret_value() if settings.telegram_webhook_secret else None
    if not constant_eq(request.headers.get("x-telegram-bot-api-secret-token"), secret):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    if int(request.headers.get("content-length") or 0) > 64_000:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "too_large")
    try:
        update = await request.json()
    except ValueError:
        return {"ok": True}
    if isinstance(update, dict):
        await telegram.handle_update(session, update)
    return {"ok": True}
