import { leadStatusMeta, isLeadStatus, LATE_MINUTES } from '../model/status'
import type { LeadEvent, LeadRow } from '../model/types'

const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** Tarix qatori matni (backend LeadEvent.kind + meta) */
export function eventTitle(e: LeadEvent): string {
  const who = e.actor ?? 'Xodim'
  const via = str(e.meta.via) === 'telegram' ? ' (Telegram)' : ''
  switch (e.kind) {
    case 'created':
      return 'Sayt orqali yaratildi'
    case 'duplicate':
      return 'Takroriy ariza yuborildi'
    case 'telegram_sent':
      return 'Telegram guruhga yuborildi'
    case 'telegram_failed':
      return 'Telegram’ga yuborilmadi — qayta urinish'
    case 'taken':
      return `${who} «Men oldim» bosdi${via}`
    case 'status': {
      const s = str(e.meta.status)
      return `Status: ${isLeadStatus(s) ? leadStatusMeta[s].label : s}${e.actor ? ` · ${e.actor}` : ''}${via}`
    }
    case 'note':
      return `${who} izoh ${Number(e.meta.length) ? 'yozdi' : 'o‘chirdi'}`
    default:
      return e.kind
  }
}

/** Ariza manbasi (sahifa) — meta.page yoki LeadRow.page */
export const eventPage = (e: LeadEvent) => str(e.meta.page)

/** Yangi va 15 daqiqadan ko‘p javobsiz — qizil */
export function isLate(lead: Pick<LeadRow, 'status' | 'created_at'>, now = Date.now()): boolean {
  return lead.status === 'new' && now - new Date(lead.created_at).getTime() > LATE_MINUTES * 60_000
}

export const localeLabels: Record<string, string> = { uz: 'O‘zbekcha', ru: 'Ruscha', en: 'Inglizcha' }
