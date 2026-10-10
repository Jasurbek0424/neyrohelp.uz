"""Maqolalar (admin, editor)."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Query, Request, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import ContentEditor, SessionDep
from app.core.revalidate import purge
from app.models import Doctor, Post, PostCategory, PostStatus
from app.schemas.admin import AdminSeo, Page, PostAdmin, PostIn, PostListItem, PostPatch, SeoIn, lt

from ._common import (
    audit,
    comp,
    ensure_exists,
    ensure_slug_free,
    invalid,
    media_out,
    not_found,
    pages,
    patch_data,
    require_media,
)

router = APIRouter(prefix="/posts", tags=["admin:content"])
WORDS_PER_MINUTE = 180


def reading_minutes(body: dict | None) -> int:
    # Bo‘shliq bo‘yicha: o‘zbekcha «o‘», «g‘» apostroflari so‘zni bo‘lmasligi uchun
    words = len((body or {}).get("uz", "").split())
    return max(1, round(words / WORDS_PER_MINUTE))


def _completeness(p: Post):
    return comp(p.title, p.excerpt, p.body)


def _like(q: str) -> str:
    return "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


async def _load(session: AsyncSession, post_id: int) -> Post:
    p = await session.scalar(select(Post).where(Post.id == post_id).execution_options(populate_existing=True))
    if not p:
        raise not_found()
    return p


def post_admin(p: Post) -> PostAdmin:
    seo = p.seo or {}
    return PostAdmin(
        id=p.id,
        slug=p.slug,
        title=p.title or {},
        excerpt=p.excerpt or {},
        body=p.body or {},
        seo=AdminSeo(title=seo.get("title") or {}, description=seo.get("description") or {}),
        cover_id=p.cover_id,
        cover=media_out(p.cover),
        category_id=p.category_id,
        author_id=p.author_id,
        status=p.status,
        published_at=p.published_at,
        reading_minutes=p.reading_minutes,
        featured=p.featured,
        completeness=_completeness(p),
        updated_at=p.updated_at,
    )


async def _validate(session: AsyncSession, data: dict) -> None:
    if "category_id" in data:
        await ensure_exists(session, PostCategory, data["category_id"], "category_id")
    if data.get("author_id") is not None:
        await ensure_exists(session, Doctor, data["author_id"], "author_id")
    if data.get("cover_id"):
        await require_media(session, {("cover_id",): data["cover_id"]})


def _apply(p: Post, body: PostIn | PostPatch, data: dict) -> None:
    for key in ("slug", "cover_id", "category_id", "author_id", "status", "published_at", "featured"):
        if key in data:
            setattr(p, key, data[key])
    for key in ("title", "excerpt", "body"):
        if key in data:
            setattr(p, key, lt(getattr(body, key)))
    if "seo" in data:
        seo = body.seo or SeoIn()
        p.seo = {"title": lt(seo.title), "description": lt(seo.description)}
    p.reading_minutes = reading_minutes(p.body)


def _schedule_rules(p: Post, touched: bool) -> None:
    """scheduled → published_at kelajakda bo‘lishi shart; published va sana yo‘q → hozir."""
    now = datetime.now(UTC)
    if p.status == PostStatus.scheduled and touched and (p.published_at is None or p.published_at <= now):
        raise invalid("published_at", "future_required")
    if p.status == PostStatus.published and p.published_at is None:
        p.published_at = now


def _tags(*slugs: str) -> list[str]:
    return ["posts", *{f"post:{s}" for s in slugs}]


@router.get("", response_model=Page[PostListItem])
async def list_posts(
    user: ContentEditor,
    session: SessionDep,
    status_: Annotated[PostStatus | None, Query(alias="status")] = None,
    category_id: Annotated[int | None, Query(ge=1)] = None,
    q: Annotated[str | None, Query(min_length=1, max_length=80)] = None,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    conds = []
    if status_:
        conds.append(Post.status == status_)
    if category_id:
        conds.append(Post.category_id == category_id)
    if q:
        like = _like(q)
        conds.append(
            or_(
                Post.title["uz"].astext.ilike(like, escape="\\"),
                Post.title["ru"].astext.ilike(like, escape="\\"),
                Post.title["en"].astext.ilike(like, escape="\\"),
                Post.slug.ilike(like, escape="\\"),
            )
        )
    total = await session.scalar(select(func.count()).select_from(Post).where(*conds)) or 0
    rows = (
        await session.scalars(
            select(Post).where(*conds).order_by(Post.updated_at.desc(), Post.id.desc()).offset((page - 1) * limit).limit(limit)
        )
    ).unique().all()
    items = [
        PostListItem(
            id=p.id,
            slug=p.slug,
            title=p.title or {},
            status=p.status,
            published_at=p.published_at,
            category_id=p.category_id,
            featured=p.featured,
            completeness=_completeness(p),
            updated_at=p.updated_at,
        )
        for p in rows
    ]
    return Page[PostListItem](items=items, total=total, page=page, pages=pages(total, limit))


@router.get("/{post_id}", response_model=PostAdmin)
async def get_post(post_id: int, user: ContentEditor, session: SessionDep):
    return post_admin(await _load(session, post_id))


@router.post("", response_model=PostAdmin, status_code=status.HTTP_201_CREATED)
async def create_post(body: PostIn, user: ContentEditor, session: SessionDep):
    data = body.model_dump()
    await ensure_slug_free(session, Post, body.slug)
    await _validate(session, data)
    p = Post()
    _apply(p, body, data)
    _schedule_rules(p, touched=True)
    session.add(p)
    await session.commit()
    await purge(_tags(p.slug))
    return post_admin(await _load(session, p.id))


@router.patch("/{post_id}", response_model=PostAdmin)
async def patch_post(post_id: int, body: PostPatch, user: ContentEditor, session: SessionDep):
    p = await _load(session, post_id)
    data = patch_data(body, nullable={"cover_id", "author_id", "published_at"})
    old_slug = p.slug
    if "slug" in data:
        await ensure_slug_free(session, Post, data["slug"], post_id)
    await _validate(session, data)
    _apply(p, body, data)
    _schedule_rules(p, touched="status" in data or "published_at" in data)
    await session.commit()
    await purge(_tags(old_slug, p.slug))
    return post_admin(await _load(session, post_id))


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(post_id: int, request: Request, user: ContentEditor, session: SessionDep):
    p = await _load(session, post_id)
    slug = p.slug
    audit(session, request, user, "post_delete", "post", post_id, {"slug": slug})
    await session.delete(p)
    await session.commit()
    await purge(_tags(slug))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
