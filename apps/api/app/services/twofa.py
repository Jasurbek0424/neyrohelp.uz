"""2FA: Telegram orqali bir martalik kod va "bu qurilmani eslab qol" (ishonchli qurilma) tokeni.

Kodlar Redis'da faqat hash ko‘rinishida, 5 daqiqa yashaydi, 5 ta xato urinishdan keyin o‘chadi,
bir marta ishlatiladi. Bot faqat sendMessage qiladi — Farm Bot'ning update'lariga tegmaydi.
"""

import hmac
import json
import logging
import secrets
from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import settings
from app.core.redis import redis
from app.core.security import ALG, ISSUER, sha256
from app.models import User
from app.services import telegram

log = logging.getLogger(__name__)

CODE_TTL = 5 * 60
MAX_TRIES = 5
RESEND_AFTER = 30
TRUST_COOKIE = "nm_trust"
TRUST_AUDIENCE = "neyrohelp-trust"


class TwofaError(Exception):
    """detail kodi HTTP javobga to‘g‘ridan-to‘g‘ri chiqadi."""

    def __init__(self, detail: str, status: int = 400):
        super().__init__(detail)
        self.detail = detail
        self.status = status


def bot_token() -> str | None:
    tok = settings.twofa_bot_token or settings.telegram_bot_token
    return tok.get_secret_value() if tok else None


def enabled() -> bool:
    return bot_token() is not None


def _new_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _digest(user_id: int, code: str) -> str:
    return sha256(f"{settings.secret_key.get_secret_value()}:{user_id}:{code}")


async def _send(chat_id: int, text: str) -> None:
    token = bot_token()
    if not token:
        raise TwofaError("telegram_not_configured", 503)
    try:
        await telegram.call("sendMessage", {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}, token=token)
    except telegram.TelegramError as e:
        log.warning("2fa telegram send failed: %s", e)
        # chat not found / bot blocked / start bosilmagan
        raise TwofaError("telegram_unreachable") from e
    except Exception as e:  # tarmoq xatosi
        log.warning("2fa telegram network error", exc_info=True)
        raise TwofaError("telegram_unavailable", 503) from e


async def _issue(kind: str, user_id: int, chat_id: int, text: str, extra: dict | None = None) -> None:
    code = _new_code()
    key = f"2fa:{kind}:{user_id}"
    payload = json.dumps({"h": _digest(user_id, code), "tries": 0, **(extra or {})})
    await redis.set(key, payload, ex=CODE_TTL)
    try:
        await _send(chat_id, text.format(code=f"<code>{code}</code>"))
    except TwofaError:
        await redis.delete(key)
        raise


async def _check(kind: str, user_id: int, code: str) -> dict | None:
    """To‘g‘ri bo‘lsa payload'ni qaytaradi va kodni o‘chiradi (bir martalik)."""
    key = f"2fa:{kind}:{user_id}"
    raw = await redis.get(key)
    if not raw:
        return None
    data = json.loads(raw)
    if hmac.compare_digest(data["h"], _digest(user_id, code)):
        # Ikki parallel so‘rov bir kodni ishlatolmasin: faqat o‘chira olgan g‘olib
        return data if await redis.delete(key) else None
    data["tries"] += 1
    if data["tries"] >= MAX_TRIES:
        await redis.delete(key)
    else:
        ttl = await redis.ttl(key)
        await redis.set(key, json.dumps(data), ex=max(ttl, 1))
    return None


# ───────────────────────── Login kodi ─────────────────────────


async def send_login_code(user: User) -> bool:
    """Kod yuboradi. 30 soniya ichida qayta so‘ralsa yangisini yubormaydi (spam yo‘q). True — yuborildi."""
    if not user.telegram_id:
        raise TwofaError("telegram_not_linked")
    if not await redis.set(f"2fa:sent:{user.id}", "1", nx=True, ex=RESEND_AFTER):
        return False
    try:
        await _issue(
            "login",
            user.id,
            user.telegram_id,
            "🔐 <b>NeyroHelp admin</b>\nKirish kodi: {code}\n\nKod 5 daqiqa amal qiladi. Siz so‘ramagan bo‘lsangiz — parolingizni almashtiring.",
        )
    except TwofaError:
        await redis.delete(f"2fa:sent:{user.id}")
        raise
    return True


async def check_login_code(user: User, code: str) -> bool:
    return await _check("login", user.id, code) is not None


# ───────────────────────── Telegramni ulash ─────────────────────────


async def send_link_code(user: User, chat_id: int) -> None:
    await _issue(
        "link",
        user.id,
        chat_id,
        "🔗 <b>NeyroHelp admin</b>\nTelegramni ulash kodi: {code}\n\nKodni admin paneldagi Profil sahifasiga kiriting.",
        {"chat": chat_id},
    )


async def check_link_code(user: User, code: str) -> int | None:
    data = await _check("link", user.id, code)
    return int(data["chat"]) if data else None


# ───────────────────────── Ishonchli qurilma ─────────────────────────


def create_trust_token(user: User) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user.id),
        "ver": user.token_version,  # parol almashsa / sessiyalar bekor qilinsa — eslab qolish ham bekor
        "iat": now,
        "exp": now + timedelta(days=settings.trusted_device_days),
        "iss": ISSUER,
        "aud": TRUST_AUDIENCE,
        "typ": "trust",
        "jti": secrets.token_urlsafe(12),
    }
    return jwt.encode(payload, settings.secret_key.get_secret_value(), algorithm=ALG)


def trust_valid(token: str | None, user: User) -> bool:
    if not token or len(token) > 1024:
        return False
    try:
        data = jwt.decode(
            token,
            settings.secret_key.get_secret_value(),
            algorithms=[ALG],
            audience=TRUST_AUDIENCE,
            issuer=ISSUER,
            options={"require": ["exp", "sub", "aud", "iss"]},
        )
    except jwt.PyJWTError:
        return False
    return data.get("typ") == "trust" and data.get("sub") == str(user.id) and data.get("ver") == user.token_version
