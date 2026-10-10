"""Ma’lumotlar modeli. Tarjima qilinadigan matnlar JSONB: {"uz": "...", "ru": "...", "en": "..."}."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, Timestamped


def enum_col(e: type[enum.Enum], name: str):
    return Enum(e, name=name, values_callable=lambda x: [i.value for i in x], native_enum=False, length=24)


# ───────────────────────── Foydalanuvchilar, sessiyalar, audit ─────────────────────────


class Role(str, enum.Enum):
    admin = "admin"
    editor = "editor"
    operator = "operator"


class User(Base, Timestamped):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(enum_col(Role, "role"), default=Role.operator)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    totp_secret: Mapped[str | None] = mapped_column(String(64))
    totp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    # 2FA kodi Telegram bot orqali (ilova o‘rniga)
    telegram_id: Mapped[int | None] = mapped_column(BigInteger)
    telegram_2fa: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    failed_logins: Mapped[int] = mapped_column(SmallInteger, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Rol yoki parol o‘zgarsa oshiriladi → eski access tokenlar yaroqsiz
    token_version: Mapped[int] = mapped_column(Integer, default=0)


class RefreshToken(Base):
    """Refresh rotatsiyasi: har ishlatishda yangi token; eski token qayta kelsa — butun oila bekor."""

    __tablename__ = "refresh_tokens"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    user_agent: Mapped[str | None] = mapped_column(String(255))


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    entity: Mapped[str | None] = mapped_column(String(48))
    entity_id: Mapped[str | None] = mapped_column(String(64))
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    ip: Mapped[str | None] = mapped_column(INET)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


# ───────────────────────── Media ─────────────────────────


class Media(Base, Timestamped):
    __tablename__ = "media"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind: Mapped[str] = mapped_column(String(16), default="image")  # image | document
    mime: Mapped[str] = mapped_column(String(64))
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    size: Mapped[int] = mapped_column(Integer)
    # {"480": "ab/abcd-480.webp", "960": ..., "1600": ..., "original": ...}
    variants: Mapped[dict] = mapped_column(JSONB, default=dict)
    alt: Mapped[dict] = mapped_column(JSONB, default=dict)
    focal_x: Mapped[int] = mapped_column(SmallInteger, default=50)
    focal_y: Mapped[int] = mapped_column(SmallInteger, default=50)
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))


# ───────────────────────── Kontent ─────────────────────────


class Setting(Base):
    """Global sozlamalar: key = site | home | clinic. value — JSONB (tarjimalar ichida)."""

    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(32), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Specialty(Base, Timestamped):
    __tablename__ = "specialties"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[dict] = mapped_column(JSONB)
    order: Mapped[int] = mapped_column(Integer, default=10)


class Audience(str, enum.Enum):
    adults = "adults"
    children = "children"
    all = "all"


class Doctor(Base, Timestamped):
    __tablename__ = "doctors"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    specialty_id: Mapped[int] = mapped_column(ForeignKey("specialties.id", ondelete="RESTRICT"), index=True)
    audience: Mapped[Audience] = mapped_column(enum_col(Audience, "audience"), default=Audience.adults)
    photo_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media.id", ondelete="SET NULL"))
    lead: Mapped[dict] = mapped_column(JSONB, default=dict)
    experience_years: Mapped[int | None] = mapped_column(SmallInteger)
    qualification: Mapped[dict] = mapped_column(JSONB, default=dict)
    price: Mapped[int | None] = mapped_column(Integer)
    languages: Mapped[dict] = mapped_column(JSONB, default=dict)
    work_days: Mapped[list[str]] = mapped_column(ARRAY(String(3)), default=list)
    # [{"years": "2008–2014", "place": {...}, "detail": {...}}]
    education: Mapped[list] = mapped_column(JSONB, default=list)
    career: Mapped[list] = mapped_column(JSONB, default=list)
    # [{"title": {...}, "year": "2021", "image_id": "uuid|null"}]
    certificates: Mapped[list] = mapped_column(JSONB, default=list)
    seo: Mapped[dict] = mapped_column(JSONB, default=dict)
    order: Mapped[int] = mapped_column(Integer, default=10)
    show_on_home: Mapped[bool] = mapped_column(Boolean, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)

    specialty: Mapped[Specialty] = relationship(lazy="joined")
    photo: Mapped[Media | None] = relationship(lazy="joined")


class ServiceCategory(Base, Timestamped):
    __tablename__ = "service_categories"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[dict] = mapped_column(JSONB)
    summary: Mapped[dict] = mapped_column(JSONB, default=dict)
    description: Mapped[dict] = mapped_column(JSONB, default=dict)
    order: Mapped[int] = mapped_column(Integer, default=10)
    show_on_home: Mapped[bool] = mapped_column(Boolean, default=True)

    services: Mapped[list["Service"]] = relationship(
        back_populates="category", order_by="Service.order", lazy="selectin"
    )


class Service(Base, Timestamped):
    __tablename__ = "services"
    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("service_categories.id", ondelete="CASCADE"), index=True)
    title: Mapped[dict] = mapped_column(JSONB)
    note: Mapped[dict] = mapped_column(JSONB, default=dict)
    duration_minutes: Mapped[int | None] = mapped_column(SmallInteger)
    price: Mapped[int | None] = mapped_column(Integer)
    price_from: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=10)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    category: Mapped[ServiceCategory] = relationship(back_populates="services")


class PostCategory(Base, Timestamped):
    __tablename__ = "post_categories"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[dict] = mapped_column(JSONB)
    order: Mapped[int] = mapped_column(Integer, default=10)


class PostStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    published = "published"


class Post(Base, Timestamped):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[dict] = mapped_column(JSONB)
    excerpt: Mapped[dict] = mapped_column(JSONB, default=dict)
    body: Mapped[dict] = mapped_column(JSONB, default=dict)  # Markdown har til uchun
    cover_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media.id", ondelete="SET NULL"))
    category_id: Mapped[int] = mapped_column(ForeignKey("post_categories.id", ondelete="RESTRICT"), index=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id", ondelete="SET NULL"))
    status: Mapped[PostStatus] = mapped_column(enum_col(PostStatus, "post_status"), default=PostStatus.draft, index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    reading_minutes: Mapped[int] = mapped_column(SmallInteger, default=1)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    seo: Mapped[dict] = mapped_column(JSONB, default=dict)

    cover: Mapped[Media | None] = relationship(lazy="joined")
    category: Mapped[PostCategory] = relationship(lazy="joined")
    author: Mapped[Doctor | None] = relationship(lazy="joined")

    __table_args__ = (Index("ix_posts_status_published", "status", "published_at"),)


# ───────────────────────── Arizalar ─────────────────────────


class LeadStatus(str, enum.Enum):
    new = "new"
    in_progress = "in_progress"
    booked = "booked"
    no_answer = "no_answer"
    declined = "declined"
    callback = "callback"
    spam = "spam"


class Delivery(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"
    disabled = "disabled"


class Lead(Base, Timestamped):
    __tablename__ = "leads"
    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(16), index=True)  # +998XXXXXXXXX
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[LeadStatus] = mapped_column(enum_col(LeadStatus, "lead_status"), default=LeadStatus.new, index=True)
    taken_by: Mapped[str | None] = mapped_column(String(120))
    taken_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    taken_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    admin_note: Mapped[str | None] = mapped_column(Text)
    page: Mapped[str | None] = mapped_column(String(200))
    locale: Mapped[str] = mapped_column(String(2), default="uz")
    consent: Mapped[bool] = mapped_column(Boolean, default=False)
    tg_delivery: Mapped[Delivery] = mapped_column(enum_col(Delivery, "delivery"), default=Delivery.pending, index=True)
    tg_message_id: Mapped[int | None] = mapped_column(BigInteger)
    tg_attempts: Mapped[int] = mapped_column(SmallInteger, default=0)
    tg_last_error: Mapped[str | None] = mapped_column(String(300))

    events: Mapped[list["LeadEvent"]] = relationship(
        back_populates="lead", order_by="LeadEvent.created_at", lazy="selectin", cascade="all, delete-orphan"
    )


class LeadEvent(Base):
    """Arizaning tarixi (drawer'dagi timeline)."""

    __tablename__ = "lead_events"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(32))  # created | telegram_sent | telegram_failed | taken | status | note
    actor: Mapped[str | None] = mapped_column(String(120))
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lead: Mapped[Lead] = relationship(back_populates="events")
