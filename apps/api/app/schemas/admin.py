"""Admin API sxemalari. Kirish sxemalari qat'iy: extra="forbid", barcha matnlarga max_length."""

import uuid
from datetime import date, datetime
from typing import Annotated, Any, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.models import Audience, LeadStatus, PostStatus, Role

# ───────────────────────── Umumiy tiplar ─────────────────────────

SLUG_RE = r"^[a-z0-9-]{2,100}$"
POST_SLUG_RE = r"^[a-z0-9-]{2,120}$"

Slug = Annotated[str, StringConstraints(pattern=SLUG_RE, max_length=100)]
PostSlug = Annotated[str, StringConstraints(pattern=POST_SLUG_RE, max_length=120)]
Order = Annotated[int, Field(ge=0, le=100_000)]
Price = Annotated[int, Field(ge=0, le=1_000_000_000)]
Minutes = Annotated[int, Field(ge=1, le=1440)]
Focal = Annotated[int, Field(ge=0, le=100)]
WorkDay = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


class In(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LText(In):
    """Tarjima matni: faqat uz/ru/en, har biri ≤ 2000 belgi."""

    uz: str = Field(default="", max_length=2000)
    ru: str | None = Field(default=None, max_length=2000)
    en: str | None = Field(default=None, max_length=2000)

    def store(self) -> dict[str, str]:
        """Bazaga: bo‘sh tillar saqlanmaydi (completeness to‘g‘ri hisoblanadi)."""
        return {k: v for k, v in self.model_dump().items() if v}


class LTextReq(LText):
    """uz majburiy (sarlavhalar uchun)."""

    uz: str = Field(min_length=1, max_length=2000)


class LBody(LText):
    """Uzun matn (maqola tanasi, Markdown): har til ≤ 20000 belgi."""

    uz: str = Field(default="", max_length=20000)
    ru: str | None = Field(default=None, max_length=20000)
    en: str | None = Field(default=None, max_length=20000)


def lt(value: LText | None) -> dict[str, str]:
    return value.store() if value else {}


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    pages: int


class Completeness(BaseModel):
    uz: bool
    ru: bool
    en: bool


class AdminMedia(Out):
    id: uuid.UUID
    kind: Literal["image", "document"]
    url: str
    srcset: dict[str, str]
    width: int | None
    height: int | None
    alt: dict[str, str]
    focal_x: int
    focal_y: int
    size: int
    mime: str


class SeoIn(In):
    title: LText = LText()
    description: LText = LText()


class AdminSeo(BaseModel):
    title: dict[str, str] = {}
    description: dict[str, str] = {}


# ───────────────────────── Auth ─────────────────────────


class LoginIn(In):
    email: Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, max_length=254, min_length=3)]
    password: str = Field(min_length=1, max_length=256)
    totp: Annotated[str, StringConstraints(pattern=r"^\d{6}$")] | None = None
    remember: bool = False  # "bu qurilmani eslab qol" — 2FA shu brauzerda N kun so‘ralmaydi


class Me(Out):
    id: int
    email: str
    name: str
    role: Role
    totp_enabled: bool
    telegram_2fa: bool = False
    telegram_hint: str | None = Field(None, description="ulangan Telegram ID (maskalangan)")
    totp_required: bool = Field(False, description="admin/editor 2FA o‘rnatmagan — frontend sozlashga yo‘naltiradi")
    twofa_available: bool = Field(False, description="2FA tizimda yoqilganmi (TWOFA_ENABLED)")


class LoginOut(BaseModel):
    user: Me | None = None
    requires_totp: bool | None = None
    method: Literal["telegram", "app"] | None = None
    code_sent: bool | None = None


class UserEnvelope(BaseModel):
    user: Me


class TotpSetupOut(BaseModel):
    secret: str
    otpauth_uri: str


class TelegramLinkIn(In):
    telegram_id: int = Field(ge=1, le=10**13)


class TotpEnableIn(In):
    code: Annotated[str, StringConstraints(pattern=r"^\d{6}$")]


class PasswordIn(In):
    current: str = Field(min_length=1, max_length=256)
    new: str = Field(min_length=12, max_length=256)


# ───────────────────────── Dashboard ─────────────────────────


class LeadRow(Out):
    id: int
    full_name: str
    phone: str
    message: str | None
    status: LeadStatus
    taken_by: str | None
    taken_at: datetime | None
    tg_delivery: Literal["pending", "sent", "failed", "disabled"]
    page: str | None
    locale: str
    created_at: datetime


class LeadEventOut(Out):
    kind: str
    actor: str | None
    meta: dict[str, Any]
    created_at: datetime


class LeadDetail(LeadRow):
    admin_note: str | None
    consent: bool
    events: list[LeadEventOut]


class LeadCounts(BaseModel):
    all: int = 0
    new: int = 0
    in_progress: int = 0
    booked: int = 0
    no_answer: int = 0
    declined: int = 0
    callback: int = 0
    spam: int = 0


class LeadPage(Page[LeadRow]):
    counts: LeadCounts


class LeadPatch(In):
    status: LeadStatus | None = None
    admin_note: str | None = Field(default=None, max_length=4000)


class TodayStat(BaseModel):
    leads: int
    yesterday: int


class WaitingStat(BaseModel):
    count: int
    oldest_minutes: int | None


class BookedStat(BaseModel):
    booked: int
    total: int


class ChartPoint(BaseModel):
    date: date
    total: int
    booked: int


class TelegramStat(BaseModel):
    enabled: bool
    last_sent_at: datetime | None
    failed: int


class ContentTodo(BaseModel):
    doctors_without_photo: int
    services_without_price: int
    posts_missing_ru: int
    documents_without_file: int


class RecentPost(BaseModel):
    id: int
    title: str
    status: PostStatus
    published_at: datetime | None


class DashboardOut(BaseModel):
    today: TodayStat
    waiting: WaitingStat
    avg_response_minutes_7d: int | None
    booked_14d: BookedStat
    chart: list[ChartPoint]
    waiting_list: list[LeadRow]
    telegram: TelegramStat
    content_todo: ContentTodo | None
    recent_posts: list[RecentPost]


# ───────────────────────── Mutaxassisliklar ─────────────────────────


class SpecialtyIn(In):
    slug: Slug
    title: LTextReq
    order: Order = 10


class SpecialtyPatch(In):
    slug: Slug | None = None
    title: LTextReq | None = None
    order: Order | None = None


class AdminSpecialty(Out):
    id: int
    slug: str
    title: dict[str, str]
    order: int


# ───────────────────────── Shifokorlar ─────────────────────────


class TimelineIn(In):
    years: Annotated[str, StringConstraints(strip_whitespace=True, max_length=40)] = ""
    place: LText = LText()
    detail: LText = LText()


class CertificateIn(In):
    title: LText = LText()
    year: Annotated[str, StringConstraints(strip_whitespace=True, max_length=20)] = ""
    image_id: uuid.UUID | None = None


class DoctorBase(In):
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=160)]
    specialty_id: int = Field(ge=1)
    audience: Audience = Audience.adults
    photo_id: uuid.UUID | None = None
    lead: LText = LText()
    experience_years: int | None = Field(default=None, ge=0, le=80)
    qualification: LText = LText()
    price: Price | None = None
    languages: LText = LText()
    work_days: list[WorkDay] = Field(default_factory=list, max_length=7)
    education: list[TimelineIn] = Field(default_factory=list, max_length=30)
    career: list[TimelineIn] = Field(default_factory=list, max_length=30)
    certificates: list[CertificateIn] = Field(default_factory=list, max_length=50)
    seo: SeoIn = SeoIn()
    order: Order = 10
    show_on_home: bool = False
    is_published: bool = True


class DoctorIn(DoctorBase):
    slug: Slug


class DoctorPatch(In):
    slug: Slug | None = None
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=160)] | None = None
    specialty_id: int | None = Field(default=None, ge=1)
    audience: Audience | None = None
    photo_id: uuid.UUID | None = None
    lead: LText | None = None
    experience_years: int | None = Field(default=None, ge=0, le=80)
    qualification: LText | None = None
    price: Price | None = None
    languages: LText | None = None
    work_days: list[WorkDay] | None = Field(default=None, max_length=7)
    education: list[TimelineIn] | None = Field(default=None, max_length=30)
    career: list[TimelineIn] | None = Field(default=None, max_length=30)
    certificates: list[CertificateIn] | None = Field(default=None, max_length=50)
    seo: SeoIn | None = None
    order: Order | None = None
    show_on_home: bool | None = None
    is_published: bool | None = None


class DoctorListItem(BaseModel):
    id: int
    slug: str
    full_name: str
    specialty_id: int
    specialty_title: str
    audience: Audience
    photo: AdminMedia | None
    experience_years: int | None
    order: int
    show_on_home: bool
    is_published: bool
    completeness: Completeness


class TimelineOut(BaseModel):
    years: str = ""
    place: dict[str, str] = {}
    detail: dict[str, str] = {}


class CertificateOut(BaseModel):
    title: dict[str, str] = {}
    year: str = ""
    image_id: uuid.UUID | None = None
    image: AdminMedia | None = None


class DoctorAdmin(BaseModel):
    id: int
    slug: str
    full_name: str
    specialty_id: int
    audience: Audience
    photo_id: uuid.UUID | None
    photo: AdminMedia | None
    lead: dict[str, str]
    experience_years: int | None
    qualification: dict[str, str]
    price: int | None
    languages: dict[str, str]
    work_days: list[str]
    education: list[TimelineOut]
    career: list[TimelineOut]
    certificates: list[CertificateOut]
    seo: AdminSeo
    order: int
    show_on_home: bool
    is_published: bool
    completeness: Completeness
    updated_at: datetime


# ───────────────────────── Xizmatlar ─────────────────────────


class ServiceCategoryIn(In):
    slug: Slug
    title: LTextReq
    summary: LText = LText()
    description: LText = LText()
    order: Order = 10
    show_on_home: bool = True


class ServiceCategoryPatch(In):
    slug: Slug | None = None
    title: LTextReq | None = None
    summary: LText | None = None
    description: LText | None = None
    order: Order | None = None
    show_on_home: bool | None = None


class ServiceIn(In):
    category_id: int = Field(ge=1)
    title: LTextReq
    note: LText = LText()
    duration_minutes: Minutes | None = None
    price: Price | None = None
    price_from: bool = False
    order: Order = 10
    is_active: bool = True


class ServicePatch(In):
    category_id: int | None = Field(default=None, ge=1)
    title: LTextReq | None = None
    note: LText | None = None
    duration_minutes: Minutes | None = None
    price: Price | None = None
    price_from: bool | None = None
    order: Order | None = None
    is_active: bool | None = None


class BulkItem(In):
    id: int = Field(ge=1)
    price: Price | None = None
    duration_minutes: Minutes | None = None
    price_from: bool | None = None


class BulkIn(In):
    items: list[BulkItem] = Field(min_length=1, max_length=200)


class AdminService(BaseModel):
    id: int
    category_id: int
    title: dict[str, str]
    note: dict[str, str]
    duration_minutes: int | None
    price: int | None
    price_from: bool
    order: int
    is_active: bool
    completeness: Completeness


class ServiceCategoryOut(BaseModel):
    id: int
    slug: str
    title: dict[str, str]
    summary: dict[str, str]
    description: dict[str, str]
    order: int
    show_on_home: bool
    services: list[AdminService]


# ───────────────────────── Maqolalar ─────────────────────────


class PostCategoryIn(In):
    slug: Slug
    title: LTextReq
    order: Order = 10


class PostCategoryPatch(In):
    slug: Slug | None = None
    title: LTextReq | None = None
    order: Order | None = None


class AdminPostCategory(Out):
    id: int
    slug: str
    title: dict[str, str]
    order: int


class PostIn(In):
    slug: PostSlug
    title: LTextReq
    excerpt: LText = LText()
    body: LBody = LBody()
    seo: SeoIn = SeoIn()
    cover_id: uuid.UUID | None = None
    category_id: int = Field(ge=1)
    author_id: int | None = Field(default=None, ge=1)
    status: PostStatus = PostStatus.draft
    published_at: AwareDatetime | None = None
    featured: bool = False


class PostPatch(In):
    slug: PostSlug | None = None
    title: LTextReq | None = None
    excerpt: LText | None = None
    body: LBody | None = None
    seo: SeoIn | None = None
    cover_id: uuid.UUID | None = None
    category_id: int | None = Field(default=None, ge=1)
    author_id: int | None = Field(default=None, ge=1)
    status: PostStatus | None = None
    published_at: AwareDatetime | None = None
    featured: bool | None = None


class PostListItem(BaseModel):
    id: int
    slug: str
    title: dict[str, str]
    status: PostStatus
    published_at: datetime | None
    category_id: int
    featured: bool
    completeness: Completeness
    updated_at: datetime


class PostAdmin(BaseModel):
    id: int
    slug: str
    title: dict[str, str]
    excerpt: dict[str, str]
    body: dict[str, str]
    seo: AdminSeo
    cover_id: uuid.UUID | None
    cover: AdminMedia | None
    category_id: int
    author_id: int | None
    status: PostStatus
    published_at: datetime | None
    reading_minutes: int
    featured: bool
    completeness: Completeness
    updated_at: datetime


# ───────────────────────── Media ─────────────────────────


class MediaPatch(In):
    alt: LText | None = None
    focal_x: Focal | None = None
    focal_y: Focal | None = None


# ───────────────────────── Sozlamalar (public serializer bilan bir xil struktura) ─────────────────────────

Url = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500, pattern=r"^https://[^\s<>\"']+$")]


class HoursIn(In):
    days: LText = LText()
    time: LText = LText()


class StatIn(In):
    value: LText = LText()
    label: LText = LText()


class DirectionIn(In):
    kind: Literal["metro", "bus", "car"]
    text: LText = LText()


class SiteSettings(In):
    phone: Annotated[str, StringConstraints(pattern=r"^\+998\d{9}$")]
    phone_display: Annotated[str, StringConstraints(strip_whitespace=True, max_length=32)] = ""
    telegram: Annotated[str, StringConstraints(pattern=r"^@?[A-Za-z0-9_]{3,32}$")] | None = None
    email: EmailStr | None = None
    address: LText = LText()
    landmark: LText = LText()
    hours: list[HoursIn] = Field(default_factory=list, max_length=14)
    hours_short: LText = LText()
    response_time: LText = LText()
    stats: list[StatIn] = Field(default_factory=list, max_length=8)
    directions: list[DirectionIn] = Field(default_factory=list, max_length=10)
    license_number: Annotated[str, StringConstraints(strip_whitespace=True, max_length=64)] | None = None
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    yandex_map_url: Url | None = None
    google_map_url: Url | None = None


class HeroImageIn(In):
    image_id: uuid.UUID | None = None
    label: LText = LText()


class FaqIn(In):
    question: LText = LText()
    answer: LText = LText()


class HomeSettings(In):
    hero_eyebrow: LText = LText()
    hero_title: LText = LText()
    hero_lead: LText = LText()
    hero_images: list[HeroImageIn] = Field(default_factory=list, max_length=6)
    clinic_title: LText = LText()
    clinic_text: LText = LText()
    clinic_points: list[LText] = Field(default_factory=list, max_length=12)
    clinic_image_id: uuid.UUID | None = None
    faq: list[FaqIn] = Field(default_factory=list, max_length=30)


class ApproachIn(In):
    title: LText = LText()
    text: LText = LText()


class EquipmentIn(In):
    name: LText = LText()
    purpose: LText = LText()
    image_id: uuid.UUID | None = None


class DocumentIn(In):
    title: LText = LText()
    number: Annotated[str, StringConstraints(strip_whitespace=True, max_length=64)] = ""
    file_id: uuid.UUID | None = None


class ClinicSettings(In):
    title: LText = LText()
    lead: LText = LText()
    cover_id: uuid.UUID | None = None
    cover_caption: LText = LText()
    approach_title: LText = LText()
    approach: list[ApproachIn] = Field(default_factory=list, max_length=12)
    equipment: list[EquipmentIn] = Field(default_factory=list, max_length=50)
    documents: list[DocumentIn] = Field(default_factory=list, max_length=50)


SETTINGS_SCHEMAS: dict[str, type[In]] = {"site": SiteSettings, "home": HomeSettings, "clinic": ClinicSettings}


# ───────────────────────── Foydalanuvchilar, audit ─────────────────────────


class UserIn(In):
    email: EmailStr = Field(max_length=254)
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
    role: Role
    password: str = Field(min_length=12, max_length=256)


class UserPatch(In):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)] | None = None
    role: Role | None = None
    is_active: bool | None = None


class UserPasswordIn(In):
    password: str = Field(min_length=12, max_length=256)


class UserOut(Out):
    id: int
    email: str
    name: str
    role: Role
    is_active: bool
    totp_enabled: bool
    telegram_2fa: bool = False
    last_login_at: datetime | None
    locked_until: datetime | None
    created_at: datetime


class AuditOut(BaseModel):
    id: int
    user_id: int | None = None
    user_name: str | None
    user_role: Role | None = None
    action: str
    entity: str | None
    entity_id: str | None
    meta: dict[str, Any]
    ip: str | None
    created_at: datetime
