import type { LeadField } from './types'

/** Brauzerdagi dastlabki tekshiruv (server baribir qayta tekshiradi) */
export function validateLead(values: { full_name: string; phone: string; consent: boolean }): LeadField[] {
  const errors: LeadField[] = []
  if (values.full_name.trim().length < 2) errors.push('full_name')
  if (values.phone.replace(/\D/g, '').length !== 9) errors.push('phone')
  if (!values.consent) errors.push('consent')
  return errors
}

const FIELD_BY_LOC: Record<string, LeadField> = { full_name: 'full_name', phone: 'phone', consent: 'consent' }

/** API 422 javobi: {detail, errors: [{loc: ['body', 'phone'], type}]} → maydonlar ro‘yxati */
export function fieldsFrom422(body: unknown): LeadField[] {
  const list = (body as { errors?: unknown; detail?: unknown } | null)?.errors ?? (body as { detail?: unknown } | null)?.detail
  if (!Array.isArray(list)) return []
  const out = new Set<LeadField>()
  for (const item of list) {
    const loc = (item as { loc?: unknown })?.loc
    const key = Array.isArray(loc) ? loc[loc.length - 1] : undefined
    const field = typeof key === 'string' ? FIELD_BY_LOC[key] : undefined
    if (field) out.add(field)
  }
  return [...out]
}
