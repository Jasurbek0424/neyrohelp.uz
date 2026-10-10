import type { HoursRow } from '../model/types'

/**
 * Ish vaqti matnidan schema.org OpeningHoursSpecification.
 * Faqat ANIQ parse qilinsa qaytaradi: biror qator noaniq bo‘lsa (masalan "[09:00–18:00]") — null.
 * Dam olish kuni qatorlari ("Dam olish", "Выходной", "Closed") ro‘yxatga kirmaydi.
 */
const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
type Day = (typeof WEEK)[number]

const DAY_NAMES: Record<string, number> = {}
const add = (idx: number, ...names: string[]) => names.forEach((n) => (DAY_NAMES[n] = idx))
add(0, 'dushanba', 'du', 'понедельник', 'пн', 'monday', 'mon')
add(1, 'seshanba', 'se', 'вторник', 'вт', 'tuesday', 'tue')
add(2, 'chorshanba', 'cho', 'среда', 'ср', 'wednesday', 'wed')
add(3, 'payshanba', 'pa', 'четверг', 'чт', 'thursday', 'thu')
add(4, 'juma', 'ju', 'пятница', 'пт', 'friday', 'fri')
add(5, 'shanba', 'sha', 'суббота', 'сб', 'saturday', 'sat')
add(6, 'yakshanba', 'ya', 'воскресенье', 'вс', 'sunday', 'sun')

const CLOSED = /^(dam olish|yopiq|выходной|закрыто|closed|day off)$/i
const TIME = /^(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})$/

const dayIndex = (s: string) => DAY_NAMES[s.trim().toLowerCase().replace(/\.$/, '')]

function parseDays(text: string): Day[] | null {
  const out = new Set<Day>()
  for (const part of text.split(/[,;]/)) {
    const range = part.split(/\s*[–—-]\s*/)
    if (range.length === 1) {
      const i = dayIndex(range[0] ?? '')
      if (i === undefined) return null
      out.add(WEEK[i]!)
    } else if (range.length === 2) {
      const a = dayIndex(range[0] ?? '')
      const b = dayIndex(range[1] ?? '')
      if (a === undefined || b === undefined || b < a) return null
      for (let i = a; i <= b; i++) out.add(WEEK[i]!)
    } else return null
  }
  return out.size ? [...out] : null
}

const hhmm = (h: string, m: string) => {
  const hn = Number(h)
  const mn = Number(m)
  if (hn > 24 || mn > 59) return null
  return `${String(hn).padStart(2, '0')}:${m}`
}

export type OpeningHoursSpec = { '@type': 'OpeningHoursSpecification'; dayOfWeek: Day[]; opens: string; closes: string }

export function parseOpeningHours(rows: HoursRow[] | null | undefined): OpeningHoursSpec[] | null {
  if (!rows?.length) return null
  const specs: OpeningHoursSpec[] = []
  for (const row of rows) {
    const days = parseDays(row.days)
    if (!days) return null
    const time = row.time.trim()
    if (CLOSED.test(time)) continue
    const m = TIME.exec(time)
    if (!m) return null
    const opens = hhmm(m[1]!, m[2]!)
    const closes = hhmm(m[3]!, m[4]!)
    if (!opens || !closes) return null
    specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens, closes })
  }
  return specs.length ? specs : null
}
