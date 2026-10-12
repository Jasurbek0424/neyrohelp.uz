"""Arizalar o‘zgarganda admin panelga jonli signal (Redis pub/sub → SSE).

API 2 ta gunicorn worker + arq worker'da ishlaydi — ariza bitta jarayonda o‘zgarib, SSE oqimi
boshqasida ochiq bo‘lishi mumkin, shuning uchun signal Redis kanali orqali tarqatiladi.
Payload'da shaxsiy ma'lumot yo‘q: panel faqat keshni yangilaydi va ma'lumotni API'dan o‘zi oladi.
"""

import json
import logging

from app.core.redis import redis

CHANNEL = "nm:leads"

log = logging.getLogger(__name__)


async def publish(lead_id: int, kind: str) -> None:
    """Signal yetmasa ham ariza saqlangan — panel zaxira polling bilan baribir ko‘radi."""
    try:
        await redis.publish(CHANNEL, json.dumps({"id": lead_id, "kind": kind}))
    except Exception:
        log.warning("lead event publish failed", exc_info=True)
