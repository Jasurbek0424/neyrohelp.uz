"""Kontent o‘zgarganda: Redis kesh + Next.js ISR teglari tozalanadi."""

import logging
from collections.abc import Iterable

import httpx

from .cache import invalidate
from .config import settings

log = logging.getLogger(__name__)


async def purge(tags: Iterable[str]) -> None:
    tags = sorted(set(tags))
    if not tags:
        return
    await invalidate(tags)
    if settings.env == "test":
        return
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                f"{settings.web_internal_url}/api/revalidate",
                json={"tags": tags},
                headers={"x-revalidate-secret": settings.revalidate_secret.get_secret_value()},
            )
    except httpx.HTTPError:
        # Next ishlamayotgan bo‘lsa ham ISR TTL (1 soat) tugaganda sahifa yangilanadi
        log.warning("Next revalidate failed for %s", tags)
