import type { components } from '@/shared/api/schema'

/**
 * Sozlamalar `/settings/{key}` — PUT tanasi OpenAPI sxemasi (extra="forbid").
 * GET esa har `<x>_id` yonida yechilgan `<x>: AdminMedia | null` qaytaradi (OpenAPI'da tipsiz dict) —
 * shuning uchun GET qiymati `SettingsResolved<K>`; PUT'dan oldin yechilgan Media maydonlari olib tashlanadi.
 */
type S = components['schemas']

export type SettingsKey = 'site' | 'home' | 'clinic'
export type SiteSettings = S['SiteSettings']
export type HomeSettings = S['HomeSettings']
export type ClinicSettings = S['ClinicSettings']
export type SettingsByKey = { site: SiteSettings; home: HomeSettings; clinic: ClinicSettings }

type Media = S['AdminMedia']
/** `foo_id` → `foo: Media | null` (ichki ro‘yxatlarda ham) */
type Resolved<T> = T extends (infer U)[]
  ? Resolved<U>[]
  : T extends object
    ? { [K in keyof T]: Resolved<T[K]> } & { [K in keyof T as K extends `${infer B}_id` ? B : never]?: Media | null }
    : T
export type SettingsResolved<K extends SettingsKey> = Resolved<SettingsByKey[K]>

/** Forma generik ishlaydi (sxema bo‘yicha), shu sabab qiymat — oddiy obyekt */
export type SettingsValue = Record<string, unknown>
