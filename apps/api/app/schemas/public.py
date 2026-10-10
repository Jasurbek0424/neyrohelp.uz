"""Public API javoblari — matnlar tanlangan tilga yechilgan holda."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MediaOut(Out):
    id: str
    url: str
    width: int | None = None
    height: int | None = None
    alt: str = ""
    focal_x: int = 50
    focal_y: int = 50
    srcset: dict[str, str] = Field(default_factory=dict, description="kenglik → URL (webp)")


class HoursRow(Out):
    days: str
    time: str


class StatRow(Out):
    value: str
    label: str


class DirectionRow(Out):
    kind: Literal["metro", "bus", "car"]
    text: str


class SiteOut(Out):
    phone: str
    phone_display: str
    telegram: str | None = None
    email: str | None = None
    address: str = ""
    landmark: str = ""
    hours: list[HoursRow] = []
    hours_short: str = ""
    response_time: str = ""
    stats: list[StatRow] = []
    directions: list[DirectionRow] = []
    license_number: str | None = None
    lat: float | None = None
    lng: float | None = None
    yandex_map_url: str | None = None
    google_map_url: str | None = None


class HeroImage(Out):
    image: MediaOut | None = None
    label: str = ""


class FaqRow(Out):
    question: str
    answer: str


class HomeOut(Out):
    hero_eyebrow: str = ""
    hero_title: str = ""
    hero_lead: str = ""
    hero_images: list[HeroImage] = []
    clinic_title: str = ""
    clinic_text: str = ""
    clinic_points: list[str] = []
    clinic_image: MediaOut | None = None
    faq: list[FaqRow] = []


class ApproachRow(Out):
    title: str
    text: str


class EquipmentRow(Out):
    name: str
    purpose: str = ""
    image: MediaOut | None = None


class DocumentRow(Out):
    title: str
    number: str = ""
    file_url: str | None = None


class ClinicOut(Out):
    title: str = ""
    lead: str = ""
    cover: MediaOut | None = None
    cover_caption: str = ""
    approach_title: str = ""
    approach: list[ApproachRow] = []
    equipment: list[EquipmentRow] = []
    documents: list[DocumentRow] = []


class ServiceOut(Out):
    id: int
    title: str
    note: str = ""
    duration_minutes: int | None = None
    price: int | None = None
    price_from: bool = False


class ServiceGroupOut(Out):
    id: int
    slug: str
    title: str
    summary: str = ""
    description: str = ""
    show_on_home: bool = True
    services: list[ServiceOut] = []


class SpecialtyOut(Out):
    id: int
    slug: str
    title: str


class DoctorCardOut(Out):
    id: int
    slug: str
    full_name: str
    specialty: SpecialtyOut
    audience: Literal["adults", "children", "all"]
    photo: MediaOut | None = None
    experience_years: int | None = None


class TimelineRow(Out):
    years: str
    place: str
    detail: str = ""


class CertificateRow(Out):
    title: str
    year: str = ""
    image: MediaOut | None = None


class SeoOut(Out):
    title: str = ""
    description: str = ""


class DoctorOut(DoctorCardOut):
    lead: str = ""
    qualification: str = ""
    price: int | None = None
    languages: str = ""
    work_days: list[str] = []
    education: list[TimelineRow] = []
    career: list[TimelineRow] = []
    certificates: list[CertificateRow] = []
    seo: SeoOut = SeoOut()
    updated_at: datetime


class PostCategoryOut(Out):
    id: int
    slug: str
    title: str


class AuthorOut(Out):
    slug: str
    full_name: str
    specialty: str = ""
    lead: str = ""
    photo: MediaOut | None = None


class PostCardOut(Out):
    id: int
    slug: str
    title: str
    excerpt: str = ""
    cover: MediaOut | None = None
    category: PostCategoryOut
    author: AuthorOut | None = None
    reading_minutes: int = 1
    published_at: datetime | None = None
    featured: bool = False


class PostOut(PostCardOut):
    body: str = Field("", description="Markdown (HTML o‘chirilgan holda render qilinadi)")
    seo: SeoOut = SeoOut()
    updated_at: datetime
    translated: bool = Field(True, description="Tanlangan tilda tarjima bormi (yo‘q bo‘lsa uz ko‘rsatilgan)")


class PostPage(Out):
    items: list[PostCardOut]
    total: int
    page: int
    pages: int


class SitemapEntry(Out):
    slug: str
    updated_at: datetime


class SitemapOut(Out):
    doctors: list[SitemapEntry]
    posts: list[SitemapEntry]


class LeadIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=9, max_length=24, description="9 ta raqam yoki +998XXXXXXXXX")
    message: str | None = Field(default=None, max_length=2000)
    consent: Literal[True]
    page: str | None = Field(default=None, max_length=200, pattern=r"^/[\w\-/]*$")
    locale: Literal["uz", "ru", "en"] = "uz"
    # Bot tuzoqlari
    website: str | None = Field(default=None, max_length=200, description="honeypot — bo‘sh bo‘lishi kerak")
    elapsed_ms: int | None = Field(default=None, ge=0, description="forma ochilgandan beri o‘tgan vaqt")


class LeadAccepted(BaseModel):
    ok: bool = True
