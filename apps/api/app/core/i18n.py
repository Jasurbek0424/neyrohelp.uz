from typing import Literal

Locale = Literal["uz", "ru", "en"]
LOCALES: tuple[Locale, ...] = ("uz", "ru", "en")
DEFAULT: Locale = "uz"

LText = dict[str, str]


def t(value: LText | None, locale: Locale) -> str:
    """Tanlangan til, bo‘lmasa o‘zbekcha (fallback)."""
    if not value:
        return ""
    return value.get(locale) or value.get(DEFAULT) or next(iter(value.values()), "")


def completeness(*values: LText | None) -> dict[str, bool]:
    """Admin uchun: har til bo‘yicha barcha maydonlar to‘ldirilganmi."""
    return {loc: all(bool(v and v.get(loc)) for v in values) for loc in LOCALES}
