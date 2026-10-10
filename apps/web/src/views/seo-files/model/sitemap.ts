import type { MetadataRoute } from 'next'

import { getSitemapIndex } from '@/entities/page'
import { getPostLocales } from '@/entities/post'
import { routes } from '@/shared/config/routes'
import { defaultLocale, locales, type Locale } from '@/shared/i18n/config'
import { absoluteUrl } from '@/shared/lib/seo'

type Entry = { path: string; lastModified?: string; available?: readonly Locale[]; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' }

const maxDate = (dates: string[]) => dates.reduce<string | undefined>((a, b) => (!a || b > a ? b : a), undefined)

/** Kichik parallel cheklov (API'ni bir zumda yuzlab so‘rov bilan bosmaslik uchun) */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i]!)
      }
    }),
  )
  return out
}

/**
 * Barcha public sahifalar × 3 til, har biri hreflang alternativlari bilan.
 * Tarjimasi yo‘q maqolalar faqat uz versiyada (ru/en noindex).
 */
export async function buildSitemap(): Promise<MetadataRoute.Sitemap> {
  const { doctors, posts } = await getSitemapIndex()
  const latestDoctor = maxDate(doctors.map((d) => d.updated_at))
  const latestPost = maxDate(posts.map((p) => p.updated_at))
  const latest = maxDate([latestDoctor, latestPost].filter((d): d is string => Boolean(d)))
  const postLocales = await mapLimit(posts, 6, (p) => getPostLocales(p.slug))

  const entries: Entry[] = [
    { path: routes.home, lastModified: latest, priority: 1, changeFrequency: 'weekly' },
    { path: routes.clinic, lastModified: latest, priority: 0.8, changeFrequency: 'monthly' },
    { path: routes.services, lastModified: latest, priority: 0.9, changeFrequency: 'monthly' },
    { path: routes.doctors, lastModified: latestDoctor, priority: 0.9, changeFrequency: 'weekly' },
    { path: routes.blog, lastModified: latestPost, priority: 0.7, changeFrequency: 'daily' },
    { path: routes.contacts, lastModified: latest, priority: 0.8, changeFrequency: 'monthly' },
    { path: '/maxfiylik', priority: 0.2, changeFrequency: 'yearly' },
    ...doctors.map((d): Entry => ({ path: `${routes.doctors}/${d.slug}`, lastModified: d.updated_at, priority: 0.7, changeFrequency: 'monthly' })),
    ...posts.map((p, i): Entry => ({ path: `${routes.blog}/${p.slug}`, lastModified: p.updated_at, available: postLocales[i], priority: 0.6, changeFrequency: 'monthly' })),
  ]

  return entries.flatMap(({ path, lastModified, available = locales, priority, changeFrequency }) => {
    const languages: Record<string, string> = Object.fromEntries(available.map((l) => [l, absoluteUrl(`/${l}${path}`)]))
    languages['x-default'] = absoluteUrl(`/${available.includes(defaultLocale) ? defaultLocale : available[0]}${path}`)
    return available.map((l) => ({
      url: absoluteUrl(`/${l}${path}`),
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
    }))
  })
}
