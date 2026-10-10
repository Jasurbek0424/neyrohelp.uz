import { z } from 'zod'

import { isWorkDay, type DoctorAdmin, type DoctorInput, type Timeline } from '@/entities/admin-doctor'
import type { Media } from '@/entities/media'
import { cleanLt, emptyLText, fillState, toLt as lt, type ContentLocale, type LText } from '@/shared/lib/admin/ltext'

/** Forma holati: DoctorInput + UI uchun yechilgan rasmlar (payload'ga kirmaydi) */
export type DoctorDraft = Omit<Required<DoctorInput>, 'certificates' | 'photo_id'> & {
  photo_id: string | null
  photo: Media | null
  certificates: { title: LText; year: string; image_id: string | null; image: Media | null }[]
}

const tl = (t: Timeline) => ({ years: t.years ?? '', place: lt(t.place), detail: lt(t.detail) })

export function toDraft(d?: DoctorAdmin | null): DoctorDraft {
  if (!d) {
    return {
      slug: '',
      full_name: '',
      specialty_id: 0,
      audience: 'adults',
      photo_id: null,
      photo: null,
      lead: emptyLText(),
      experience_years: null,
      qualification: emptyLText(),
      price: null,
      languages: emptyLText(),
      work_days: [],
      education: [],
      career: [],
      certificates: [],
      seo: { title: emptyLText(), description: emptyLText() },
      order: 10,
      show_on_home: false,
      is_published: true,
    }
  }
  return {
    slug: d.slug,
    full_name: d.full_name,
    specialty_id: d.specialty_id,
    audience: d.audience,
    photo_id: d.photo_id ?? d.photo?.id ?? null,
    photo: d.photo,
    lead: lt(d.lead),
    experience_years: d.experience_years,
    qualification: lt(d.qualification),
    price: d.price,
    languages: lt(d.languages),
    work_days: d.work_days.filter(isWorkDay),
    education: d.education.map(tl),
    career: d.career.map(tl),
    certificates: d.certificates.map((c) => ({ title: lt(c.title), year: c.year ?? '', image_id: c.image_id ?? c.image?.id ?? null, image: c.image ?? null })),
    seo: { title: lt(d.seo?.title), description: lt(d.seo?.description) },
    order: d.order,
    show_on_home: d.show_on_home,
    is_published: d.is_published,
  }
}

/** Backendga: faqat DoctorIn maydonlari (extra="forbid") */
export function toPayload(d: DoctorDraft): DoctorInput {
  const timeline = (rows: DoctorDraft['education']) =>
    rows
      .map((r) => ({ years: r.years.trim(), place: cleanLt(r.place), detail: cleanLt(r.detail) }))
      .filter((r) => r.years || r.place.uz || r.detail.uz)
  return {
    slug: d.slug.trim(),
    full_name: d.full_name.trim(),
    specialty_id: d.specialty_id,
    audience: d.audience,
    photo_id: d.photo_id,
    lead: cleanLt(d.lead),
    experience_years: d.experience_years,
    qualification: cleanLt(d.qualification),
    price: d.price,
    languages: cleanLt(d.languages),
    work_days: d.work_days,
    education: timeline(d.education),
    career: timeline(d.career),
    certificates: d.certificates.map((c) => ({ title: cleanLt(c.title), year: c.year.trim(), image_id: c.image_id })),
    seo: { title: cleanLt(d.seo.title), description: cleanLt(d.seo.description) },
    order: d.order,
    show_on_home: d.show_on_home,
    is_published: d.is_published,
  }
}

const ltMax = (n: number) => z.object({ uz: z.string().max(n, `Ko‘pi bilan ${n} belgi`), ru: z.string().max(n, `Ko‘pi bilan ${n} belgi`), en: z.string().max(n, `Ko‘pi bilan ${n} belgi`) })

export const doctorSchema = z.object({
  full_name: z.string().trim().min(2, 'F.I.O. kamida 2 belgi').max(160, 'F.I.O. juda uzun'),
  slug: z.string().regex(/^[a-z0-9-]{2,100}$/, 'Faqat lotin kichik harflar, raqam va «-» (2–100 belgi)'),
  specialty_id: z.number().int().min(1, 'Mutaxassislikni tanlang'),
  experience_years: z.number().int().min(0).max(80, '0–80 oralig‘ida').nullable(),
  price: z.number().int().min(0).max(1_000_000_000, 'Narx juda katta').nullable(),
  order: z.number().int().min(0, 'Manfiy bo‘lmasin').max(100_000),
  lead: ltMax(280),
  seo: z.object({ title: ltMax(70), description: ltMax(200) }),
})

/** Maydon → tab (xato bo‘lsa shu tabga o‘tiladi) */
export function tabOfField(path: string): 'main' | 'edu' | 'cert' | 'seo' {
  if (path.startsWith('education') || path.startsWith('career')) return 'edu'
  if (path.startsWith('certificates')) return 'cert'
  if (path.startsWith('seo')) return 'seo'
  return 'main'
}

/** Til nuqtalari uchun: tarjima qilinadigan barcha maydonlar */
export function translatable(d: DoctorDraft): LText[] {
  return [
    d.lead,
    d.qualification,
    d.languages,
    d.seo.title,
    d.seo.description,
    ...d.education.flatMap((r) => [r.place, r.detail]),
    ...d.career.flatMap((r) => [r.place, r.detail]),
    ...d.certificates.map((c) => c.title),
  ]
}

export function localeFill(d: DoctorDraft) {
  const f = translatable(d)
  const out = {} as Record<ContentLocale, ReturnType<typeof fillState>>
  for (const l of ['uz', 'ru', 'en'] as const) out[l] = fillState(f, l)
  return out
}
