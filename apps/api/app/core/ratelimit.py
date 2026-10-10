"""Redis fixed-window rate limit. Redis ishlamasa — ruxsat beradi (fail-open), lekin log yozadi."""

import logging
import time

from fastapi import HTTPException, Request, status

from .redis import redis

log = logging.getLogger(__name__)


def client_ip(request: Request) -> str:
    """Haqiqiy mijoz IP.

    API faqat 127.0.0.1 da tinglaydi, oldida Caddy. Caddy `X-Real-IP` ni o‘zi QAYTA YOZADI
    (trusted_proxies: Cloudflare diapazonlari + client_ip_headers CF-Connecting-IP),
    shuning uchun mijoz yuborgan soxta X-Forwarded-For hisobga olinmaydi.
    """
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")


async def hit(key: str, limit: int, window_seconds: int) -> bool:
    """True — limitdan oshdi."""
    bucket = int(time.time() // window_seconds)
    rkey = f"rl:{key}:{bucket}"
    try:
        pipe = redis.pipeline()
        pipe.incr(rkey)
        pipe.expire(rkey, window_seconds + 5)
        count, _ = await pipe.execute()
        return int(count) > limit
    except Exception:
        log.warning("rate limit redis error", exc_info=True)
        return False


async def enforce(key: str, limit: int, window_seconds: int) -> None:
    if await hit(key, limit, window_seconds):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="too_many_requests",
            headers={"Retry-After": str(window_seconds)},
        )
