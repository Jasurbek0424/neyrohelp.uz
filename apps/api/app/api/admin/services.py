"""Xizmatlar va xizmat kategoriyalari (admin, editor). Narx o‘zgarishlari audit logga yoziladi."""

from fastapi import APIRouter, Request, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import ContentEditor, SessionDep
from app.core.revalidate import purge
from app.models import Service, ServiceCategory, User
from app.schemas.admin import (
    AdminService,
    BulkIn,
    ServiceCategoryIn,
    ServiceCategoryOut,
    ServiceCategoryPatch,
    ServiceIn,
    ServicePatch,
    lt,
)

from ._common import audit, comp, ensure_exists, ensure_slug_free, invalid, not_found, patch_data

router = APIRouter(tags=["admin:content"])
TAGS = ["services"]
PRICE_FIELDS = ("price", "price_from")


def service_out(x: Service) -> AdminService:
    return AdminService(
        id=x.id,
        category_id=x.category_id,
        title=x.title or {},
        note=x.note or {},
        duration_minutes=x.duration_minutes,
        price=x.price,
        price_from=x.price_from,
        order=x.order,
        is_active=x.is_active,
        completeness=comp(x.title),
    )


def category_out(c: ServiceCategory) -> ServiceCategoryOut:
    return ServiceCategoryOut(
        id=c.id,
        slug=c.slug,
        title=c.title or {},
        summary=c.summary or {},
        description=c.description or {},
        order=c.order,
        show_on_home=c.show_on_home,
        services=[service_out(x) for x in sorted(c.services, key=lambda s: (s.order, s.id))],
    )


async def full_list(session: AsyncSession) -> list[ServiceCategoryOut]:
    cats = (
        await session.scalars(
            select(ServiceCategory)
            .options(selectinload(ServiceCategory.services))
            .order_by(ServiceCategory.order, ServiceCategory.id)
            .execution_options(populate_existing=True)
        )
    ).all()
    return [category_out(c) for c in cats]


def _price_audit(session: AsyncSession, request: Request, user: User, svc: Service, old: dict, new: dict) -> None:
    changes = {k: {"old": old[k], "new": new[k]} for k in PRICE_FIELDS if k in new and new[k] != old[k]}
    if changes:
        audit(session, request, user, "price_change", "service", svc.id, changes)


# ───────────────────────── Xizmatlar ─────────────────────────


@router.get("/services", response_model=list[ServiceCategoryOut])
async def list_services(user: ContentEditor, session: SessionDep):
    return await full_list(session)


@router.post("/services", response_model=AdminService, status_code=status.HTTP_201_CREATED)
async def create_service(body: ServiceIn, request: Request, user: ContentEditor, session: SessionDep):
    await ensure_exists(session, ServiceCategory, body.category_id, "category_id")
    svc = Service(
        category_id=body.category_id,
        title=body.title.store(),
        note=lt(body.note),
        duration_minutes=body.duration_minutes,
        price=body.price,
        price_from=body.price_from,
        order=body.order,
        is_active=body.is_active,
    )
    session.add(svc)
    await session.flush()
    if svc.price is not None:
        audit(session, request, user, "price_change", "service", svc.id, {"price": {"old": None, "new": svc.price}})
    await session.commit()
    await purge(TAGS)
    return service_out(svc)


@router.patch("/services/bulk", response_model=list[ServiceCategoryOut])
async def bulk_services(body: BulkIn, request: Request, user: ContentEditor, session: SessionDep):
    ids = [x.id for x in body.items]
    if len(set(ids)) != len(ids):
        raise invalid("items", "duplicate_id")
    found = {s.id: s for s in (await session.scalars(select(Service).where(Service.id.in_(ids)).with_for_update())).all()}
    for i, item in enumerate(body.items):
        svc = found.get(item.id)
        if not svc:
            raise invalid(("items", i, "id"), "not_found")
        data = item.model_dump(exclude_unset=True, exclude={"id"})
        if data.get("price_from", False) is None:
            raise invalid(("items", i, "price_from"), "null_not_allowed")
        old = {"price": svc.price, "price_from": svc.price_from}
        for key, value in data.items():
            setattr(svc, key, value)
        _price_audit(session, request, user, svc, old, data)
    await session.commit()
    await purge(TAGS)
    return await full_list(session)


@router.patch("/services/{service_id}", response_model=AdminService)
async def patch_service(service_id: int, body: ServicePatch, request: Request, user: ContentEditor, session: SessionDep):
    svc = await session.get(Service, service_id)
    if not svc:
        raise not_found()
    data = patch_data(body, nullable={"duration_minutes", "price"})
    if "category_id" in data:
        await ensure_exists(session, ServiceCategory, data["category_id"], "category_id")
    old = {"price": svc.price, "price_from": svc.price_from}
    for key, value in data.items():
        setattr(svc, key, lt(getattr(body, key)) if key in ("title", "note") else value)
    _price_audit(session, request, user, svc, old, data)
    await session.commit()
    await purge(TAGS)
    await session.refresh(svc)
    return service_out(svc)


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(service_id: int, request: Request, user: ContentEditor, session: SessionDep):
    svc = await session.get(Service, service_id)
    if not svc:
        raise not_found()
    audit(session, request, user, "service_delete", "service", service_id, {"title": (svc.title or {}).get("uz")})
    await session.delete(svc)
    await session.commit()
    await purge(TAGS)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ───────────────────────── Kategoriyalar ─────────────────────────


async def _load_category(session: AsyncSession, category_id: int) -> ServiceCategory:
    c = await session.scalar(
        select(ServiceCategory)
        .where(ServiceCategory.id == category_id)
        .options(selectinload(ServiceCategory.services))
        .execution_options(populate_existing=True)
    )
    if not c:
        raise not_found()
    return c


@router.post("/service-categories", response_model=ServiceCategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(body: ServiceCategoryIn, user: ContentEditor, session: SessionDep):
    await ensure_slug_free(session, ServiceCategory, body.slug)
    c = ServiceCategory(
        slug=body.slug,
        title=body.title.store(),
        summary=lt(body.summary),
        description=lt(body.description),
        order=body.order,
        show_on_home=body.show_on_home,
    )
    session.add(c)
    await session.commit()
    await purge(TAGS)
    return category_out(await _load_category(session, c.id))


@router.patch("/service-categories/{category_id}", response_model=ServiceCategoryOut)
async def patch_category(category_id: int, body: ServiceCategoryPatch, user: ContentEditor, session: SessionDep):
    c = await _load_category(session, category_id)
    data = patch_data(body)
    if "slug" in data:
        await ensure_slug_free(session, ServiceCategory, data["slug"], category_id)
    for key, value in data.items():
        setattr(c, key, lt(getattr(body, key)) if key in ("title", "summary", "description") else value)
    await session.commit()
    await purge(TAGS)
    return category_out(await _load_category(session, category_id))


@router.delete("/service-categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: int, request: Request, user: ContentEditor, session: SessionDep):
    c = await _load_category(session, category_id)
    audit(
        session,
        request,
        user,
        "service_category_delete",
        "service_category",
        category_id,
        {"slug": c.slug, "services": len(c.services)},
    )
    session.expunge(c)
    # services jadvali ON DELETE CASCADE — bazaning o‘zi o‘chiradi
    await session.execute(delete(ServiceCategory).where(ServiceCategory.id == category_id))
    await session.commit()
    await purge(TAGS)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
