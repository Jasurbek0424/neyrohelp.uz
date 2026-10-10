"""Bosh sahifa ko‘rsatkichlari (Toshkent vaqti bo‘yicha kunlar)."""

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter
from sqlalchemy import Date, case, cast, func, or_, select

from app.core.deps import AnyStaff, SessionDep
from app.models import Delivery, Doctor, Lead, LeadEvent, LeadStatus, Post, Role, Service, Setting
from app.schemas.admin import (
    BookedStat,
    ChartPoint,
    ContentTodo,
    DashboardOut,
    LeadRow,
    RecentPost,
    TelegramStat,
    TodayStat,
    WaitingStat,
)
from app.services import telegram

router = APIRouter(tags=["admin:dashboard"])
TZ = ZoneInfo("Asia/Tashkent")


def day_start(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=TZ)


@router.get("/dashboard", response_model=DashboardOut)
async def dashboard(user: AnyStaff, session: SessionDep):
    now = datetime.now(UTC)
    today = now.astimezone(TZ).date()
    t0, y0 = day_start(today), day_start(today - timedelta(days=1))
    d14 = day_start(today - timedelta(days=13))

    today_n = await session.scalar(select(func.count()).select_from(Lead).where(Lead.created_at >= t0)) or 0
    yday_n = (
        await session.scalar(select(func.count()).select_from(Lead).where(Lead.created_at >= y0, Lead.created_at < t0)) or 0
    )

    waiting_n, oldest = (
        await session.execute(
            select(func.count(), func.min(Lead.created_at)).where(Lead.status == LeadStatus.new)
        )
    ).one()
    oldest_minutes = int((now - oldest).total_seconds() // 60) if oldest else None

    avg_seconds = await session.scalar(
        select(func.avg(func.extract("epoch", Lead.taken_at - Lead.created_at))).where(
            Lead.taken_at.is_not(None), Lead.created_at >= now - timedelta(days=7)
        )
    )
    avg_minutes = round(float(avg_seconds) / 60) if avg_seconds is not None else None

    booked_case = case((Lead.status == LeadStatus.booked, 1), else_=0)
    local_day = cast(func.timezone("Asia/Tashkent", Lead.created_at), Date)
    rows = (
        await session.execute(
            select(local_day, func.count(), func.sum(booked_case))
            .where(Lead.created_at >= d14, Lead.status != LeadStatus.spam)
            .group_by(local_day)
        )
    ).all()
    by_day = {d: (int(total), int(booked or 0)) for d, total, booked in rows}
    chart = []
    for i in range(13, -1, -1):
        d = today - timedelta(days=i)
        total, booked = by_day.get(d, (0, 0))
        chart.append(ChartPoint(date=d, total=total, booked=booked))

    waiting_list = (
        await session.scalars(select(Lead).where(Lead.status == LeadStatus.new).order_by(Lead.created_at).limit(5))
    ).all()

    last_sent = await session.scalar(select(func.max(LeadEvent.created_at)).where(LeadEvent.kind == "telegram_sent"))
    failed = await session.scalar(select(func.count()).select_from(Lead).where(Lead.tg_delivery == Delivery.failed)) or 0

    content_todo = None
    recent: list[RecentPost] = []
    if user.role != Role.operator:
        clinic = await session.get(Setting, "clinic")
        docs = (clinic.value if clinic else {}).get("documents", [])
        content_todo = ContentTodo(
            doctors_without_photo=await session.scalar(
                select(func.count()).select_from(Doctor).where(Doctor.photo_id.is_(None))
            )
            or 0,
            services_without_price=await session.scalar(
                select(func.count()).select_from(Service).where(Service.is_active.is_(True), Service.price.is_(None))
            )
            or 0,
            posts_missing_ru=await session.scalar(
                select(func.count())
                .select_from(Post)
                .where(or_(Post.body["ru"].astext.is_(None), Post.body["ru"].astext == ""))
            )
            or 0,
            documents_without_file=sum(1 for d in docs if isinstance(d, dict) and not d.get("file_id")),
        )
        posts = (
            await session.execute(
                select(Post.id, Post.title, Post.status, Post.published_at).order_by(Post.updated_at.desc()).limit(3)
            )
        ).all()
        recent = [
            RecentPost(id=p.id, title=(p.title or {}).get("uz", ""), status=p.status, published_at=p.published_at)
            for p in posts
        ]

    return DashboardOut(
        today=TodayStat(leads=today_n, yesterday=yday_n),
        waiting=WaitingStat(count=waiting_n, oldest_minutes=oldest_minutes),
        avg_response_minutes_7d=avg_minutes,
        booked_14d=BookedStat(booked=sum(b for _, b in by_day.values()), total=sum(t for t, _ in by_day.values())),
        chart=chart,
        waiting_list=[LeadRow.model_validate(x) for x in waiting_list],
        telegram=TelegramStat(enabled=telegram.enabled(), last_sent_at=last_sent, failed=failed),
        content_todo=content_todo,
        recent_posts=recent,
    )

