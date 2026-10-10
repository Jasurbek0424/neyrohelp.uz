import logging
from contextlib import asynccontextmanager
from pathlib import Path

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import ORJSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.api.admin import router as admin_router
from app.api.public.content import router as public_router
from app.api.public.leads import router as leads_router
from app.core.config import settings
from app.core.db import engine
from app.core.redis import redis

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("api")

MAX_BODY = 1 * 1024 * 1024  # 1 MB (upload endpointi o‘z limitini tekshiradi)
MULTIPART_OVERHEAD = 64 * 1024


def body_limit(method: str, path: str) -> int:
    if method == "POST" and path.rstrip("/").endswith("/admin/media"):
        return settings.max_upload_mb * 1024 * 1024 + MULTIPART_OVERHEAD
    return MAX_BODY


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.arq = None
    if settings.env != "test":
        try:
            app.state.arq = await create_pool(RedisSettings.from_dsn(settings.redis_url))
        except Exception:  # noqa: BLE001
            log.warning("arq pool unavailable — arizalar worker cron orqali yuboriladi")
    yield
    if app.state.arq:
        await app.state.arq.close()
    await redis.aclose()
    await engine.dispose()


app = FastAPI(
    title="NeyroMed API",
    version="1.0.0",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
    # Production'da API hujjatlari ochiq emas
    docs_url=None if settings.env == "prod" else "/api/docs",
    redoc_url=None,
    openapi_url=None if settings.env == "prod" else "/api/openapi.json",
)


class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        length = request.headers.get("content-length")
        if length and length.isdigit() and int(length) > body_limit(request.method, request.url.path):
            return ORJSONResponse({"detail": "too_large"}, status_code=413)
        response = await call_next(request)
        h = response.headers
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        h.setdefault("Cross-Origin-Resource-Policy", "same-site")
        h.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        if request.url.path.startswith("/api/v1/admin"):
            h["Cache-Control"] = "no-store"
        return response


class BodyLimit:
    """Content-Length bo‘lmasa ham (chunked) tana oqim bo‘yicha sanaladi va limitdan oshsa 413.

    Ichki qatlamlar (multipart parser, FastAPI) istisnoni 400 ga o‘rashi mumkin, shuning uchun
    limit oshgach javob shu yerda 413 bilan almashtiriladi.
    """

    BODY = b'{"detail":"too_large"}'

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        limit = body_limit(scope["method"], scope["path"])
        received = 0
        exceeded = False
        started = False

        async def limited() -> Message:
            nonlocal received, exceeded
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    exceeded = True
                    raise HTTPException(status_code=413, detail="too_large")
            return message

        async def send_413() -> None:
            await send(
                {
                    "type": "http.response.start",
                    "status": 413,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"content-length", str(len(self.BODY)).encode()),
                        (b"x-content-type-options", b"nosniff"),
                        (b"cache-control", b"no-store"),
                    ],
                }
            )
            await send({"type": "http.response.body", "body": self.BODY})

        async def guarded_send(message: Message) -> None:
            nonlocal started
            if message["type"] == "http.response.start":
                if started:
                    return
                started = True
                if exceeded:
                    await send_413()
                    return
            elif exceeded:
                return  # asl javob tanasi tashlab yuboriladi (413 allaqachon yuborilgan)
            await send(message)

        try:
            await self.app(scope, limited, guarded_send)
        except Exception:
            if exceeded and not started:
                started = True
                await send_413()
                return
            raise


app.add_middleware(SecurityHeaders)
app.add_middleware(BodyLimit)
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["content-type", "x-csrf-token"],
    max_age=600,
)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    # Maydon nomlari va xato turlari qaytariladi, kiritilgan qiymat (input) qaytarilmaydi
    errors = [{"loc": e.get("loc"), "type": e.get("type")} for e in exc.errors()]
    return ORJSONResponse({"detail": "validation_error", "errors": errors}, status_code=422)


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("unhandled error on %s %s", request.method, request.url.path)
    return ORJSONResponse({"detail": "internal_error"}, status_code=500)


app.include_router(public_router, prefix="/api/v1")
app.include_router(leads_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")


@app.get("/api/health", include_in_schema=False)
async def health():
    from app.core.db import SessionLocal

    async with SessionLocal() as s:
        await s.execute(text("select 1"))
    redis_ok = True
    try:
        await redis.ping()
    except Exception:  # noqa: BLE001
        redis_ok = False
    return {"ok": True, "redis": redis_ok}


# Dev'da media fayllarni API beradi; production'da Caddy to‘g‘ridan-to‘g‘ri beradi
if settings.env != "prod":
    Path(settings.media_dir).mkdir(parents=True, exist_ok=True)
    app.mount(settings.media_url, StaticFiles(directory=settings.media_dir), name="media")
