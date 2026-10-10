"""Arizalar boti (Farm Bot'dan alohida token). Bot API'ga httpx orqali."""

import html
import logging
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Delivery, Lead, LeadEvent, LeadStatus

from .phone import format_uz_phone

log = logging.getLogger(__name__)
TZ = ZoneInfo("Asia/Tashkent")

STATUS_TEXT = {
    LeadStatus.new: "Yangi",
    LeadStatus.in_progress: "Aloqada",
    LeadStatus.booked: "Qabulga yozildi",
    LeadStatus.no_answer: "Javob bermadi",
    LeadStatus.declined: "Rad etdi",
    LeadStatus.callback: "Keyinroq qo‘ng‘iroq",
    LeadStatus.spam: "Spam",
}
FINAL_FROM_TELEGRAM = {LeadStatus.booked, LeadStatus.no_answer, LeadStatus.declined}


def enabled() -> bool:
    return bool(settings.telegram_bot_token and settings.telegram_chat_id)


class TelegramError(Exception):
    pass


async def call(method: str, payload: dict) -> dict:
    token = settings.telegram_bot_token.get_secret_value() if settings.telegram_bot_token else ""
    async with httpx.AsyncClient(timeout=8) as client:
        res = await client.post(f"{settings.telegram_api_base}/bot{token}/{method}", json=payload)
    try:
        data = res.json()
    except ValueError as e:
        raise TelegramError(f"HTTP {res.status_code}") from e
    if not data.get("ok"):
        raise TelegramError(str(data.get("description", "telegram error"))[:280])
    return data.get("result") or {}


def fmt_time(dt: datetime) -> str:
    return dt.astimezone(TZ).strftime("%d.%m.%Y %H:%M")


def render(lead: Lead) -> str:
    e = html.escape
    lines = [
        f"<b>{'Yangi ariza' if lead.status == LeadStatus.new else 'Ariza'} #{lead.id}</b>",
        "",
        f"<b>F.I.O.:</b> {e(lead.full_name)}",
        f"<b>Telefon:</b> {e(format_uz_phone(lead.phone))}",
    ]
    if lead.message:
        lines.append(f"<b>Shikoyat:</b> {e(lead.message[:900])}")
    if lead.page:
        lines.append(f"<b>Sahifa:</b> {e(lead.page)}")
    lines += ["", fmt_time(lead.created_at)]
    status = f"<b>Status:</b> {STATUS_TEXT[lead.status]}"
    if lead.taken_by:
        status += f" — {e(lead.taken_by)}"
        if lead.taken_at:
            status += f" ({lead.taken_at.astimezone(TZ):%H:%M})"
    lines.append(status)
    return "\n".join(lines)


def keyboard(lead: Lead) -> dict:
    if lead.status == LeadStatus.new:
        return {"inline_keyboard": [[{"text": "Men oldim", "callback_data": f"take:{lead.id}"}]]}
    if lead.status == LeadStatus.in_progress:
        return {
            "inline_keyboard": [
                [
                    {"text": "Yozildi", "callback_data": f"st:{lead.id}:booked"},
                    {"text": "Javob bermadi", "callback_data": f"st:{lead.id}:no_answer"},
                    {"text": "Rad etdi", "callback_data": f"st:{lead.id}:declined"},
                ]
            ]
        }
    return {"inline_keyboard": []}


async def deliver(session: AsyncSession, lead: Lead) -> bool:
    """Arizani guruhga yuboradi. Natija arizaga va tarixga yoziladi; xato bo‘lsa worker qayta uradi."""
    if not enabled():
        lead.tg_delivery = Delivery.disabled
        await session.commit()
        return False
    lead.tg_attempts += 1
    try:
        msg = await call(
            "sendMessage",
            {
                "chat_id": settings.telegram_chat_id,
                "text": render(lead),
                "parse_mode": "HTML",
                "link_preview_options": {"is_disabled": True},
                "reply_markup": keyboard(lead),
            },
        )
        lead.tg_delivery = Delivery.sent
        lead.tg_message_id = msg.get("message_id")
        lead.tg_last_error = None
        session.add(LeadEvent(lead_id=lead.id, kind="telegram_sent"))
        await session.commit()
        return True
    except (TelegramError, httpx.HTTPError) as err:
        lead.tg_delivery = Delivery.failed
        lead.tg_last_error = str(err)[:300]
        session.add(LeadEvent(lead_id=lead.id, kind="telegram_failed", meta={"attempt": lead.tg_attempts}))
        await session.commit()
        log.warning("lead %s telegram delivery failed: %s", lead.id, err)
        return False


async def sync(lead: Lead) -> None:
    """Guruhdagi xabarni ariza holatiga moslaydi (admin paneldan o‘zgarsa ham)."""
    if not enabled() or not lead.tg_message_id:
        return
    try:
        await call(
            "editMessageText",
            {
                "chat_id": settings.telegram_chat_id,
                "message_id": lead.tg_message_id,
                "text": render(lead),
                "parse_mode": "HTML",
                "link_preview_options": {"is_disabled": True},
                "reply_markup": keyboard(lead),
            },
        )
    except TelegramError as err:
        if "not modified" not in str(err).lower():
            log.warning("editMessageText failed for lead %s: %s", lead.id, err)
    except httpx.HTTPError:
        log.warning("editMessageText network error for lead %s", lead.id)


async def answer(callback_id: str, text: str) -> None:
    try:
        await call("answerCallbackQuery", {"callback_query_id": callback_id, "text": text[:190]})
    except (TelegramError, httpx.HTTPError):
        pass


def display_name(user: dict) -> str:
    name = " ".join(x for x in (user.get("first_name"), user.get("last_name")) if x).strip()
    return (name or (f"@{user['username']}" if user.get("username") else f"ID {user.get('id')}"))[:120]


async def handle_update(session: AsyncSession, update: dict) -> None:
    q = update.get("callback_query")
    if not q or not isinstance(q.get("data"), str):
        return
    chat_id = str(((q.get("message") or {}).get("chat") or {}).get("id"))
    if chat_id != str(settings.telegram_chat_id):
        await answer(q["id"], "Ruxsat yo‘q")
        return

    parts = q["data"].split(":")
    if len(parts) < 2 or not parts[1].isdigit():
        return
    action, lead_id = parts[0], int(parts[1])
    # SELECT ... FOR UPDATE — ikki admin bir vaqtda «Men oldim» bossa ham faqat bittasi oladi
    from sqlalchemy import select

    lead = await session.scalar(select(Lead).where(Lead.id == lead_id).with_for_update())
    if not lead:
        await answer(q["id"], "Ariza topilmadi")
        return

    who = display_name(q.get("from") or {})
    reply = ""
    changed = False
    if action == "take":
        if lead.status != LeadStatus.new:
            reply = f"Bu arizani {lead.taken_by} olgan" if lead.taken_by else "Ariza allaqachon olingan"
        else:
            lead.status = LeadStatus.in_progress
            lead.taken_by = who
            lead.taken_at = datetime.now(UTC)
            session.add(LeadEvent(lead_id=lead.id, kind="taken", actor=who, meta={"via": "telegram"}))
            reply, changed = "Ariza sizga biriktirildi", True
    elif action == "st" and len(parts) == 3:
        try:
            new = LeadStatus(parts[2])
        except ValueError:
            return
        if new in FINAL_FROM_TELEGRAM and lead.status == LeadStatus.in_progress:
            lead.status = new
            session.add(LeadEvent(lead_id=lead.id, kind="status", actor=who, meta={"status": new.value, "via": "telegram"}))
            reply, changed = f"Status: {STATUS_TEXT[new]}", True
    await session.commit()
    if changed:
        await sync(lead)
    await answer(q["id"], reply)
