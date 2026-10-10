import { cleanLt, fillState, toLt, type ContentLocale, type LText } from '@/shared/lib/admin/ltext'

import type { FieldDef, Group } from './fields'

type Obj = Record<string, unknown>

function emptyFor(f: FieldDef): unknown {
  switch (f.kind) {
    case 'lt':
      return { uz: '', ru: '', en: '' }
    case 'list':
    case 'ltlist':
      return []
    case 'select':
      return f.options[0]?.value ?? ''
    case 'number':
    case 'media':
      return null
    default:
      return f.nullable ? null : ''
  }
}

export function newItem(fields: FieldDef[]): Obj {
  return Object.fromEntries(fields.map((f) => [f.key, emptyFor(f)]))
}

/** GET qiymatini forma holatiga: yetishmagan kalitlar bo‘sh qiymat bilan to‘ldiriladi */
export function normalize(value: Obj | undefined, groups: Group[]): Obj {
  const walk = (src: Obj, fields: FieldDef[]): Obj => {
    const out: Obj = { ...src }
    for (const f of fields) {
      const v = src[f.key]
      if (f.kind === 'list') out[f.key] = Array.isArray(v) ? v.map((it) => walk((it ?? {}) as Obj, f.fields)) : []
      else if (f.kind === 'ltlist') out[f.key] = Array.isArray(v) ? v : []
      else if (f.kind === 'lt') out[f.key] = toLt(v as LText)
      else if (v === undefined) out[f.key] = emptyFor(f)
    }
    return out
  }
  return walk(value ?? {}, groups.flatMap((g) => g.fields))
}

/** PUT tanasi: faqat sxemadagi kalitlar, LText tozalangan, bo‘sh ixtiyoriy matnlar null */
export function toPayload(value: Obj, groups: Group[]): Obj {
  const walk = (src: Obj, fields: FieldDef[]): Obj => {
    const out: Obj = {}
    for (const f of fields) {
      const v = src[f.key]
      switch (f.kind) {
        case 'lt':
          out[f.key] = cleanLt(v as LText)
          break
        case 'ltlist':
          out[f.key] = ((v as LText[]) ?? []).map(cleanLt).filter((x) => x.uz || x.ru || x.en)
          break
        case 'list':
          out[f.key] = ((v as Obj[]) ?? []).map((it) => walk(it, f.fields))
          break
        case 'number':
          out[f.key] = v === '' || v === null || v === undefined ? null : Number(v)
          break
        case 'text': {
          const s = String(v ?? '').trim()
          out[f.key] = !s && f.nullable ? null : s
          break
        }
        default:
          out[f.key] = v ?? null
      }
    }
    return out
  }
  return walk(value, groups.flatMap((g) => g.fields))
}

/** Client validatsiya: pattern/required — kalit yo‘li bo‘yicha xatolar */
export function validate(value: Obj, groups: Group[]): Record<string, string> {
  const errs: Record<string, string> = {}
  const walk = (src: Obj, fields: FieldDef[], prefix: string) => {
    for (const f of fields) {
      const path = prefix + f.key
      const v = src[f.key]
      if (f.kind === 'text') {
        const s = String(v ?? '').trim()
        if (f.required && !s) errs[path] = 'Majburiy maydon'
        else if (s && f.pattern && !f.pattern.test(s)) errs[path] = f.patternMsg ?? 'Noto‘g‘ri format'
      } else if (f.kind === 'number' && v !== null && v !== '' && v !== undefined) {
        const n = Number(v)
        if (Number.isNaN(n) || (f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) errs[path] = `${f.min} … ${f.max} oralig‘ida son`
      } else if (f.kind === 'list') {
        ;((v as Obj[]) ?? []).forEach((it, i) => walk(it, f.fields, `${path}.${i}.`))
      }
    }
  }
  walk(value, groups.flatMap((g) => g.fields), '')
  return errs
}

export function collectLt(value: Obj, groups: Group[]): LText[] {
  const out: LText[] = []
  const walk = (src: Obj, fields: FieldDef[]) => {
    for (const f of fields) {
      const v = src[f.key]
      if (f.kind === 'lt') out.push(v as LText)
      else if (f.kind === 'ltlist') out.push(...((v as LText[]) ?? []))
      else if (f.kind === 'list') ((v as Obj[]) ?? []).forEach((it) => walk(it, f.fields))
    }
  }
  walk(value, groups.flatMap((g) => g.fields))
  return out
}

export function localeFill(value: Obj, groups: Group[]) {
  const lts = collectLt(value, groups)
  const out = {} as Record<ContentLocale, ReturnType<typeof fillState>>
  for (const l of ['uz', 'ru', 'en'] as const) out[l] = fillState(lts, l)
  return out
}
