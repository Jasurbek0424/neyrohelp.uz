"""Maqola kategoriyalari (admin, editor)."""

from fastapi import APIRouter, Request, Response, status
from sqlalchemy import func, select

from app.core.deps import ContentEditor, SessionDep
from app.core.revalidate import purge
from app.models import Post, PostCategory
from app.schemas.admin import AdminPostCategory, PostCategoryIn, PostCategoryPatch

from ._common import audit, conflict, ensure_slug_free, not_found, patch_data

router = APIRouter(prefix="/post-categories", tags=["admin:content"])
TAGS = ["posts"]


@router.get("", response_model=list[AdminPostCategory])
async def list_post_categories(user: ContentEditor, session: SessionDep):
    rows = (await session.scalars(select(PostCategory).order_by(PostCategory.order, PostCategory.id))).all()
    return [AdminPostCategory.model_validate(x) for x in rows]


@router.post("", response_model=AdminPostCategory, status_code=status.HTTP_201_CREATED)
async def create_post_category(body: PostCategoryIn, user: ContentEditor, session: SessionDep):
    await ensure_slug_free(session, PostCategory, body.slug)
    obj = PostCategory(slug=body.slug, title=body.title.store(), order=body.order)
    session.add(obj)
    await session.commit()
    await purge(TAGS)
    return AdminPostCategory.model_validate(obj)


@router.patch("/{item_id}", response_model=AdminPostCategory)
async def patch_post_category(item_id: int, body: PostCategoryPatch, user: ContentEditor, session: SessionDep):
    obj = await session.get(PostCategory, item_id)
    if not obj:
        raise not_found()
    data = patch_data(body)
    if "slug" in data:
        await ensure_slug_free(session, PostCategory, data["slug"], item_id)
        obj.slug = data["slug"]
    if body.title is not None:
        obj.title = body.title.store()
    if "order" in data:
        obj.order = data["order"]
    await session.commit()
    await purge(TAGS)
    return AdminPostCategory.model_validate(obj)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post_category(item_id: int, request: Request, user: ContentEditor, session: SessionDep):
    obj = await session.get(PostCategory, item_id)
    if not obj:
        raise not_found()
    if await session.scalar(select(func.count()).select_from(Post).where(Post.category_id == item_id)):
        raise conflict("in_use")
    audit(session, request, user, "post_category_delete", "post_category", item_id, {"slug": obj.slug})
    await session.delete(obj)
    await session.commit()
    await purge(TAGS)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
