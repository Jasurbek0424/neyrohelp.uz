import 'server-only'

import { apiGet, tags } from '@/shared/api/server'
import type { Locale } from '@/shared/i18n/config'

import type { ClinicPage, HomePage, SitemapIndex } from '../model/types'

export async function getHomePage(locale: Locale): Promise<HomePage> {
  const page = await apiGet<HomePage>('/public/pages/home', { locale, tags: [tags.home] })
  if (!page) throw new Error('Home page not found')
  return page
}

export async function getClinicPage(locale: Locale): Promise<ClinicPage> {
  const page = await apiGet<ClinicPage>('/public/pages/clinic', { locale, tags: [tags.clinic] })
  if (!page) throw new Error('Clinic page not found')
  return page
}

/** Barcha shifokor va maqola sluglari (sitemap, generateStaticParams) */
export async function getSitemapIndex(): Promise<SitemapIndex> {
  return (await apiGet<SitemapIndex>('/public/sitemap', { tags: [tags.doctors, tags.posts] })) ?? { doctors: [], posts: [] }
}
