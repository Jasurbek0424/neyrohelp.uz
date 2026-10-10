import 'server-only'

import { apiGet, tags } from '@/shared/api/server'
import type { Locale } from '@/shared/i18n/config'

import type { Site } from '../model/types'

/** Sayt sozlamalari (telefon, manzil, ish vaqti) — har sahifada kerak, teg: settings */
export async function getSite(locale: Locale): Promise<Site> {
  const site = await apiGet<Site>('/public/site', { locale, tags: [tags.settings] })
  if (!site) throw new Error('Site settings not found')
  return site
}
