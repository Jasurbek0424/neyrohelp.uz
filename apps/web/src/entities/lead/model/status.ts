import type { Tone } from '@/shared/ui/admin/StatusTag'

import type { LeadStatus, TgDelivery } from './types'

export const leadStatusMeta: Record<LeadStatus, { label: string; tone: Tone }> = {
  new: { label: 'Yangi', tone: 'coral' },
  in_progress: { label: 'Aloqada', tone: 'navy' },
  booked: { label: 'Yozildi', tone: 'ok' },
  no_answer: { label: 'Javob bermadi', tone: 'warn' },
  callback: { label: 'Qayta qo‘ng‘iroq', tone: 'navy' },
  declined: { label: 'Rad etdi', tone: 'neutral' },
  spam: { label: 'Spam', tone: 'neutral' },
}

/** Status tablari tartibi (dizayn A3 + kontraktdagi callback) */
export const leadStatusTabs: LeadStatus[] = ['new', 'in_progress', 'booked', 'no_answer', 'callback', 'declined', 'spam']

/** Drawer'dagi status segmentlari (new → «Olish» tugmasi bilan) */
export const leadStatusChoices: LeadStatus[] = ['in_progress', 'booked', 'no_answer', 'declined', 'callback', 'spam']

export const isLeadStatus = (v: string | null | undefined): v is LeadStatus => Boolean(v && v in leadStatusMeta)

/** 15 daqiqadan oshgan javobsiz ariza — qizil */
export const LATE_MINUTES = 15

export const tgMeta: Record<TgDelivery, { text: string; color: string; icon: 'tgOk' | 'tgErr' | 'clock' }> = {
  sent: { text: 'Yuborildi', color: 'text-(--am-ok)', icon: 'tgOk' },
  failed: { text: 'Xato · qayta urinish', color: 'text-(--am-warn)', icon: 'tgErr' },
  pending: { text: 'Navbatda', color: 'text-ink-2', icon: 'clock' },
  disabled: { text: 'O‘chirilgan', color: 'text-ink-2', icon: 'clock' },
}
