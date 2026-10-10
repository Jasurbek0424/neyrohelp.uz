/** Admin uchun vaqt formatlari (Toshkent vaqti) */

const TZ = 'Asia/Tashkent'
const monthsUz = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr']
const monthsShort = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek']
const weekdaysUz = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']

type Parts = { y: number; m: number; d: number; hh: string; mm: string; wd: number }

export function tzParts(value: string | Date): Parts {
  const date = typeof value === 'string' ? new Date(value) : value
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { y: +get('year'), m: +get('month'), d: +get('day'), hh: get('hour'), mm: get('minute'), wd: wdMap[get('weekday')] ?? 0 }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** YYYY-MM-DD (Toshkent) */
export function isoDay(value: string | Date = new Date()): string {
  const p = tzParts(value)
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}

export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function minutesSince(value: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(value).getTime()) / 60_000))
}

/** "3 daq", "2 soat", "kecha", "4 kun" — mobil kartalar va kutish ro‘yxati uchun */
export function ageShort(value: string, now = Date.now()): string {
  const min = minutesSince(value, now)
  if (min < 60) return `${min} daq`
  const h = Math.floor(min / 60)
  if (isoDay(value) === isoDay(new Date(now))) return `${h} soat`
  if (isoDay(value) === addDays(isoDay(new Date(now)), -1)) return 'kecha'
  return `${Math.floor(h / 24) || 1} kun`
}

/** "18 daq oldin" / "Bugun 10:20" / "Kecha 17:40" / "05.10 14:20" */
export function leadTime(value: string, now = Date.now()): string {
  const min = minutesSince(value, now)
  if (min < 60) return `${min} daq oldin`
  const p = tzParts(value)
  const today = isoDay(new Date(now))
  const day = isoDay(value)
  if (day === today) return `Bugun ${p.hh}:${p.mm}`
  if (day === addDays(today, -1)) return `Kecha ${p.hh}:${p.mm}`
  return `${pad(p.d)}.${pad(p.m)} ${p.hh}:${p.mm}`
}

export function hhmm(value: string): string {
  const p = tzParts(value)
  return `${p.hh}:${p.mm}`
}

/** "8 oktyabr 2026" */
export function longDate(value: string | Date): string {
  const p = tzParts(value)
  return `${p.d} ${monthsUz[p.m - 1]} ${p.y}`
}

/** "12 okt" */
export function shortDate(value: string): string {
  const p = tzParts(value)
  return `${p.d} ${monthsShort[p.m - 1]}`
}

/** "Payshanba, 8 oktyabr" */
export function weekdayDate(value: Date = new Date()): string {
  const p = tzParts(value)
  return `${weekdaysUz[p.wd]}, ${p.d} ${monthsUz[p.m - 1]}`
}

/** "25.09" */
export function ddmm(day: string): string {
  return `${day.slice(8, 10)}.${day.slice(5, 7)}`
}

/** "bugun, 10:42" / "kecha, 09:10" / "5 oktyabr, 12:00" */
export function relativeDayTime(value: string, now = Date.now()): string {
  const p = tzParts(value)
  const today = isoDay(new Date(now))
  const day = isoDay(value)
  const t = `${p.hh}:${p.mm}`
  if (day === today) return `bugun, ${t}`
  if (day === addDays(today, -1)) return `kecha, ${t}`
  return `${p.d} ${monthsUz[p.m - 1]}, ${t}`
}

/** <input type="datetime-local"> qiymati (Toshkent) ↔ ISO */
export function toLocalInput(value: string | null | undefined): string {
  if (!value) return ''
  const p = tzParts(value)
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${p.hh}:${p.mm}`
}
export function fromLocalInput(local: string): string | null {
  if (!local) return null
  // Toshkent UTC+5, yozgi vaqt yo‘q
  return new Date(`${local}:00+05:00`).toISOString()
}

export function greeting(now: Date = new Date()): string {
  const h = Number(tzParts(now).hh)
  if (h < 11) return 'Xayrli tong'
  if (h < 18) return 'Xayrli kun'
  return 'Xayrli kech'
}
