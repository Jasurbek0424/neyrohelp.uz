import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

import jwt
import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from .config import settings

# OWASP tavsiyasi bo‘yicha argon2id parametrlari (kichik server uchun muvozanatli)
_ph = PasswordHasher(time_cost=3, memory_cost=64 * 1024, parallelism=2)
# Foydalanuvchi topilmasa ham bir xil vaqt sarflash uchun (user enumeration'dan himoya)
_DUMMY_HASH = _ph.hash("dummy-password-for-timing")

ALG = "HS256"
ISSUER = "neyromed-api"
AUDIENCE = "neyromed-admin"

ACCESS_COOKIE = "nm_access"
REFRESH_COOKIE = "nm_refresh"
CSRF_COOKIE = "nm_csrf"
CSRF_HEADER = "x-csrf-token"


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, hashed: str | None) -> bool:
    try:
        return _ph.verify(hashed or _DUMMY_HASH, password) and hashed is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(hashed: str) -> bool:
    return _ph.check_needs_rehash(hashed)


def create_access_token(user_id: int, role: str, token_version: int) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "ver": token_version,
        "iat": now,
        "nbf": now,
        "exp": now + timedelta(minutes=settings.access_ttl_minutes),
        "iss": ISSUER,
        "aud": AUDIENCE,
        "typ": "access",
    }
    return jwt.encode(payload, settings.secret_key.get_secret_value(), algorithm=ALG)


def decode_access_token(token: str) -> dict | None:
    try:
        data = jwt.decode(
            token,
            settings.secret_key.get_secret_value(),
            algorithms=[ALG],  # algoritm qat'iy — "none"/RS-HS chalkashligi yo‘q
            audience=AUDIENCE,
            issuer=ISSUER,
            options={"require": ["exp", "sub", "iat", "aud", "iss"]},
        )
    except jwt.PyJWTError:
        return None
    return data if data.get("typ") == "access" else None


def new_opaque_token() -> tuple[str, str]:
    """(token, sha256 hash). Bazada faqat hash saqlanadi."""
    token = secrets.token_urlsafe(48)
    return token, sha256(token)


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def new_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def csrf_valid(cookie_value: str | None, header_value: str | None) -> bool:
    return bool(cookie_value and header_value and hmac.compare_digest(cookie_value, header_value))


def constant_eq(a: str | None, b: str | None) -> bool:
    return bool(a and b and hmac.compare_digest(a.encode(), b.encode()))


def new_totp_secret() -> str:
    return pyotp.random_base32()


def verify_totp(secret: str | None, code: str | None) -> bool:
    if not secret or not code or not code.isdigit():
        return False
    return pyotp.TOTP(secret).verify(code, valid_window=1)


def totp_uri(secret: str, email: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name="NeyroMed")
