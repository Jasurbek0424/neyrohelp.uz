"""Parol siyosati: ≥ 12 belgi, email bilan bir xil emas, sizib chiqqan top-10k ro‘yxatida yo‘q."""

from functools import lru_cache
from pathlib import Path

MIN_LENGTH = 12
MAX_LENGTH = 256
_LIST = Path(__file__).resolve().parent.parent / "data" / "common_passwords.txt"


@lru_cache
def _common() -> frozenset[str]:
    try:
        return frozenset(x.strip() for x in _LIST.read_text(encoding="utf-8").splitlines() if x.strip())
    except OSError:
        return frozenset()


def password_problem(password: str, email: str | None) -> str | None:
    """None — parol yaroqli, aks holda xato kodi."""
    if len(password) < MIN_LENGTH:
        return "password_too_short"
    if len(password) > MAX_LENGTH:
        return "password_too_long"
    low = password.strip().lower()
    if email and low in {email.strip().lower(), email.strip().lower().split("@")[0]}:
        return "password_same_as_email"
    if low in _common():
        return "password_too_common"
    if len(set(password)) < 4:
        return "password_too_common"
    return None
