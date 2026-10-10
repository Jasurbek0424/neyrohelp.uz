"""Redis cache-aside + teg bo‘yicha tozalash.

get_or_set: kalit bo‘lsa — Redis'dan, bo‘lmasa — funksiyadan va TTL bilan saqlaydi.
Har kalit o‘z teglari setiga yoziladi; invalidate(tags) shu setlardagi kalitlarni o‘chiradi.
Redis ishlamay qolsa sayt ishlashda davom etadi (to‘g‘ridan-to‘g‘ri bazadan).
"""

import logging
from collections.abc import Awaitable, Callable, Iterable
from typing import Any

import orjson

from .config import settings
from .redis import redis

log = logging.getLogger(__name__)
PREFIX = "cache:"


async def get_or_set(key: str, tags: Iterable[str], fn: Callable[[], Awaitable[Any]], ttl: int | None = None) -> Any:
    full = PREFIX + key
    try:
        hit = await redis.get(full)
        if hit is not None:
            return orjson.loads(hit)
    except Exception:
        log.warning("redis get failed", exc_info=True)
        return await fn()

    value = await fn()
    try:
        ttl = ttl or settings.public_cache_ttl
        pipe = redis.pipeline()
        pipe.set(full, orjson.dumps(value), ex=ttl)
        for tag in tags:
            pipe.sadd(f"{PREFIX}tag:{tag}", full)
            pipe.expire(f"{PREFIX}tag:{tag}", ttl + 60)
        await pipe.execute()
    except Exception:
        log.warning("redis set failed", exc_info=True)
    return value


async def invalidate(tags: Iterable[str]) -> int:
    removed = 0
    try:
        for tag in tags:
            tag_key = f"{PREFIX}tag:{tag}"
            keys = await redis.smembers(tag_key)
            if keys:
                removed += await redis.delete(*keys)
            await redis.delete(tag_key)
    except Exception:
        log.warning("redis invalidate failed", exc_info=True)
    return removed
