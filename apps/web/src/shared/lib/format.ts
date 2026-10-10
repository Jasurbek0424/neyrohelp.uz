import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'

const monthsUz = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr']

/** 12 sentyabr 2026 / 12 сентября 2026 / 12 September 2026 (Toshkent vaqti) */
export function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return ''
  const d = new Date(value)
  if (locale === 'uz') {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d)
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
    return `${get('day')} ${monthsUz[get('month') - 1]} ${get('year')}`
  }
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n).replace(/ /g, ' ')
}

/** 250000 → "250 000 so‘m" / "250 000 so‘mdan" / "от 250 000 сум" */
export function formatPrice(price: number | null | undefined, t: Dictionary, from = false): string {
  if (price == null) return t.common.priceOnRequest
  const n = formatNumber(price)
  if (!from) return `${n} ${t.common.sum}`
  return t.common.from === 'dan' ? `${n} ${t.common.sum}${t.common.from}` : `${t.common.from} ${n} ${t.common.sum}`
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`
export const telegramHref = (username?: string | null) =>
  username ? `https://t.me/${username.replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '')}` : undefined

/** Foydalanuvchi/CMS kiritgan URL faqat xavfsiz sxemalar bilan */
export function safeUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url, 'https://x.invalid')
    return ['http:', 'https:', 'tel:', 'mailto:'].includes(u.protocol) ? url : undefined
  } catch {
    return undefined
  }
}
