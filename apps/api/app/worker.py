"""Fon vazifalari (arq + Redis).

Ishga tushirish:  arq app.worker.WorkerSettings
- deliver_lead       — yangi arizani Telegramga yuborish
- retry_failed       — har 5 daqiqada yetib bormaganlarni qayta yuborish (10 martagacha)
- publish_scheduled  — har daqiqada vaqti kelgan maqolalarni nashr qilish + kesh tozalash
- cleanup            — har kuni: muddati o‘tgan arizalar, eskirgan refresh tokenlar, eski audit log
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import ClassVar

from arq import cron
from arq.connections import RedisSettings
from sqlalchemy import delete, select, update

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.revalidate import purge
from app.models import AuditLog, Delivery, Lead, Post, PostStatus, RefreshToken
from app.services import telegram

log = logging.getLogger("worker")


async def deliver_lead(ctx, lead_id: int) -> bool:
    async with SessionLocal() as session:
        lead = await session.get(Lead, lead_id)
        if not lead or lead.tg_delivery == Delivery.sent:
            return False
        return await telegram.deliver(session, lead)


async def retry_failed(ctx) -> int:
    if not telegram.enabled():
        return 0
    async with SessionLocal() as session:
        rows = (
            await session.scalars(
                select(Lead)
                .where(
                    Lead.tg_delivery.in_([Delivery.failed, Delivery.pending]),
                    Lead.tg_attempts < 10,
                    Lead.created_at < datetime.now(UTC) - timedelta(minutes=1),
                )
                .limit(50)
            )
        ).all()
        ok = 0
        for lead in rows:
            ok += await telegram.deliver(session, lead)
        return ok


async def publish_scheduled(ctx) -> int:
    async with SessionLocal() as session:
        rows = (
            await session.execute(
                update(Post)
                .where(Post.status == PostStatus.scheduled, Post.published_at <= datetime.now(UTC))
                .values(status=PostStatus.published)
                .returning(Post.slug)
            )
        ).scalars().all()
        await session.commit()
    if rows:
        await purge(["posts", *[f"post:{s}" for s in rows]])
    return len(rows)


async def cleanup(ctx) -> dict:
    now = datetime.now(UTC)
    async with SessionLocal() as session:
        leads = await session.execute(
            delete(Lead).where(Lead.created_at < now - timedelta(days=settings.lead_retention_days))
        )
        tokens = await session.execute(delete(RefreshToken).where(RefreshToken.expires_at < now))
        audit = await session.execute(delete(AuditLog).where(AuditLog.created_at < now - timedelta(days=730)))
        await session.commit()
    result = {"leads": leads.rowcount, "tokens": tokens.rowcount, "audit": audit.rowcount}
    log.info("cleanup %s", result)
    return result


class WorkerSettings:
    functions: ClassVar[list] = [deliver_lead]
    cron_jobs: ClassVar[list] = [
        cron(retry_failed, minute=set(range(0, 60, 5)), run_at_startup=True),
        cron(publish_scheduled, minute=None, second=0),
        cron(cleanup, hour=3, minute=30),
    ]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 10
    job_timeout = 30
    max_tries = 3
