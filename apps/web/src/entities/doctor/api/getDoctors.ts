import 'server-only'

import { apiGet, tags } from '@/shared/api/server'
import type { Locale } from '@/shared/i18n/config'

import type { Doctor, DoctorCardData, Specialty } from '../model/types'

type ListOptions = { specialty?: string; home?: boolean; limit?: number; exclude?: number }

export async function getDoctors(locale: Locale, { specialty, home, limit, exclude }: ListOptions = {}): Promise<DoctorCardData[]> {
  return (
    (await apiGet<DoctorCardData[]>('/public/doctors', {
      locale,
      query: { specialty, home: home || undefined, limit, exclude },
      tags: [tags.doctors],
    })) ?? []
  )
}

/** null — shifokor topilmadi (sahifa notFound() chaqiradi) */
export function getDoctor(slug: string, locale: Locale): Promise<Doctor | null> {
  return apiGet<Doctor>(`/public/doctors/${encodeURIComponent(slug)}`, { locale, tags: [tags.doctors, tags.doctor(slug)] })
}

export async function getSpecialties(locale: Locale): Promise<Specialty[]> {
  return (await apiGet<Specialty[]>('/public/specialties', { locale, tags: [tags.doctors] })) ?? []
}
