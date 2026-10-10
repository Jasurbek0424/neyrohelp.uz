/**
 * Ko‘p tilli matn. Backend'ga yuboriladigan shakl (OpenAPI `LText`): {uz: string, ru?, en?}.
 * Backend javoblari esa `{[lang]: string}` (bo‘sh tillar umuman bo‘lmasligi mumkin) — o‘qish uchun `LTextLike`.
 */
export type ContentLocale = 'uz' | 'ru' | 'en'
export const contentLocales: ContentLocale[] = ['uz', 'ru', 'en']

export type LText = { uz: string; ru?: string | null; en?: string | null }
export type LTextLike = { uz?: string; ru?: string | null; en?: string | null } | { [lang: string]: string }

type Maybe = LTextLike | null | undefined

const get = (value: Maybe, locale: ContentLocale): string => ((value as Record<string, string | null | undefined> | null | undefined)?.[locale] ?? '') || ''

export const emptyLText = (): LText => ({ uz: '', ru: '', en: '' })

export function lt(value: Maybe, locale: ContentLocale = 'uz'): string {
  return get(value, locale)
}

/** O‘zbekcha bo‘lmasa — uz'ga tushadi (ro‘yxatlarda ko‘rsatish uchun) */
export function ltOr(value: Maybe, locale: ContentLocale = 'uz'): string {
  return lt(value, locale) || lt(value, 'uz')
}

/** Har qanday javobni forma holatiga: uch til ham satr */
export function toLt(value: Maybe): LText {
  return { uz: get(value, 'uz'), ru: get(value, 'ru'), en: get(value, 'en') }
}

export function setLt(value: Maybe, locale: ContentLocale, text: string): LText {
  return { ...toLt(value), [locale]: text }
}

/** Backendga: bo‘sh tillar null emas, "" (uz majburiy maydonlarda backend 422 qaytaradi) */
export function cleanLt(value: Maybe): { uz: string; ru: string; en: string } {
  return { uz: get(value, 'uz').trim(), ru: get(value, 'ru').trim(), en: get(value, 'en').trim() }
}

export type Fill = 'full' | 'partial' | 'empty'

/**
 * Til bo‘yicha to‘ldirilganlik: uz'da to‘ldirilgan maydonlarning nechtasi shu tilda bo‘sh.
 * uz uchun — umuman to‘ldirilgan maydon bormi.
 */
export function fillState(fields: Maybe[], locale: ContentLocale): { state: Fill; missing: number } {
  const base = fields.filter((f) => lt(f, 'uz').trim())
  if (locale === 'uz') return { state: base.length ? 'full' : 'empty', missing: 0 }
  const filled = base.filter((f) => lt(f, locale).trim()).length
  if (!base.length || filled === 0) return { state: 'empty', missing: base.length }
  if (filled === base.length) return { state: 'full', missing: 0 }
  return { state: 'partial', missing: base.length - filled }
}
