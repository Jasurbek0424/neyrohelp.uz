"""Admin API — barcha endpointlar autentifikatsiya va rol tekshiruvi ostida."""

from fastapi import APIRouter

from . import (
    audit,
    auth,
    dashboard,
    doctors,
    leads,
    media,
    post_categories,
    posts,
    services,
    settings,
    specialties,
    users,
)

router = APIRouter(prefix="/admin", tags=["admin"])

for _module in (auth, dashboard, leads, specialties, doctors, services, posts, post_categories, media, settings, users, audit):
    router.include_router(_module.router)
