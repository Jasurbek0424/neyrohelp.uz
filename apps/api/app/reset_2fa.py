"""Favqulodda: foydalanuvchining 2FA'sini o‘chirish (telefon yo‘qolsa, Telegram ishlamasa).

    uv run python -m app.reset_2fa admin@neyromed.uz

Faqat serverga SSH bilan kira oladigan odam ishlata oladi. Barcha sessiyalar bekor bo‘ladi,
keyingi kirishda 2FA qaytadan sozlanadi.
"""

import asyncio
import sys

from sqlalchemy import func, select

from app.api.admin.auth import revoke_user_tokens
from app.core.db import SessionLocal
from app.models import AuditLog, User


async def main(email: str) -> int:
    async with SessionLocal() as s:
        user = await s.scalar(select(User).where(func.lower(User.email) == email.strip().lower()))
        if not user:
            print(f"Topilmadi: {email}")
            return 1
        user.totp_enabled = False
        user.totp_secret = None
        user.telegram_2fa = False
        user.telegram_id = None
        user.token_version += 1
        await revoke_user_tokens(s, user.id)
        s.add(AuditLog(user_id=None, action="2fa_reset_cli", entity="user", entity_id=str(user.id), meta={}, ip=None))
        await s.commit()
        print(f"2FA o‘chirildi: {user.email}")
        return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(asyncio.run(main(sys.argv[1])))
