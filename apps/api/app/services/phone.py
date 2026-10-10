import re

_DIGITS = re.compile(r"\D")


def normalize_uz_phone(raw: str) -> str | None:
    """'90 123 45 67' | '+998 (90) 123-45-67' | '998901234567' | '8 90 123 45 67' → '+998901234567'."""
    d = _DIGITS.sub("", raw or "")
    if len(d) == 12 and d.startswith("998"):
        d = d[3:]
    elif len(d) == 10 and d.startswith("8"):
        d = d[1:]
    if len(d) != 9:
        return None
    return f"+998{d}"


def format_uz_phone(e164: str) -> str:
    d = _DIGITS.sub("", e164).removeprefix("998")
    if len(d) != 9:
        return e164
    return f"+998 {d[:2]} {d[2:5]} {d[5:7]} {d[7:]}"


def mask_phone(e164: str) -> str:
    """Loglar uchun: +998 90 *** ** 67"""
    d = _DIGITS.sub("", e164).removeprefix("998")
    return f"+998 {d[:2]} *** ** {d[-2:]}" if len(d) == 9 else "***"
