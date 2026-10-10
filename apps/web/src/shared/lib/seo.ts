import type { Metadata } from 'next'

import type { components } from '@/shared/api/schema'
import { SITE_URL } from '@/shared/config/env'
import { defaultLocale, locales, type Locale } from '@/shared/i18n/config'

type MediaOut = components['schemas']['MediaOut']

export const SITE_NAME = 'NeyroMed'

/** OG `locale` formati */
export const ogLocale: Record<Locale, string> = { uz: 'uz_UZ', ru: 'ru_RU', en: 'en_US' }

/** '/uz/blog' → 'https://neyromed.uz/uz/blog'; to‘liq URL o‘zgarmaydi */
export function absoluteUrl(path = ''): string {
  if (/^https?:\/\//.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/** Media (rasm) uchun mutlaq URL — eng katta webp variant yoki asl fayl */
export function mediaUrl(media?: MediaOut | null): string | undefined {
  if (!media?.url) return undefined
  const variants = Object.entries(media.srcset ?? {}).sort(([a], [b]) => Number(b) - Number(a))
  return absoluteUrl(variants[0]?.[1] ?? media.url)
}

/** Matnni meta description uchun qisqartiradi (so‘z chegarasida) */
export function clampText(text: string | null | undefined, max = 160): string | undefined {
  const s = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return undefined
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).trim()}…`
}

type PageMetaInput = {
  locale: Locale
  /** Til prefiksisiz yo‘l: '' | '/blog' | '/blog/slug' */
  path: string
  title?: string | null
  /** true — title shablonsiz (bosh sahifa) */
  absoluteTitle?: boolean
  description?: string | null
  type?: 'website' | 'article' | 'profile'
  image?: MediaOut | null
  /** Sahifa mavjud bo‘lgan tillar (hreflang). Standart — hammasi */
  available?: readonly Locale[]
  /** Kanonik til (masalan tarjimasi yo‘q maqola uchun 'uz') */
  canonicalLocale?: Locale
  noindex?: boolean
  publishedTime?: string | null
  modifiedTime?: string | null
  authors?: string[]
}

/**
 * Har sahifa uchun yagona metadata: title, description, canonical, hreflang (+ x-default),
 * Open Graph, Twitter va robots.
 */
export function pageMetadata(input: PageMetaInput): Metadata {
  const { locale, path, type = 'website', available = locales, noindex = false } = input
  const canonicalLocale = input.canonicalLocale ?? locale
  const url = absoluteUrl(`/${locale}${path}`)
  const canonical = absoluteUrl(`/${canonicalLocale}${path}`)
  const title = input.title?.trim() || undefined
  const description = clampText(input.description)

  const languages: Record<string, string> = {}
  for (const l of locales) if (available.includes(l)) languages[l] = absoluteUrl(`/${l}${path}`)
  languages['x-default'] = absoluteUrl(`/${available.includes(defaultLocale) ? defaultLocale : (available[0] ?? defaultLocale)}${path}`)

  const image = mediaUrl(input.image)
  const ogTitle = title ? (input.absoluteTitle ? title : `${title} — ${SITE_NAME}`) : SITE_NAME

  return {
    title: title ? (input.absoluteTitle ? { absolute: title } : title) : undefined,
    description,
    alternates: { canonical, languages },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      locale: ogLocale[locale],
      alternateLocale: available.filter((l) => l !== locale).map((l) => ogLocale[l]),
      title: ogTitle,
      description,
      ...(image ? { images: [{ url: image, width: input.image?.width ?? undefined, height: input.image?.height ?? undefined, alt: input.image?.alt || ogTitle }] } : {}),
      ...(type === 'article'
        ? { publishedTime: input.publishedTime ?? undefined, modifiedTime: input.modifiedTime ?? undefined, authors: input.authors }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}
