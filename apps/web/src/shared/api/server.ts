import 'server-only'

import type { Locale } from '@/shared/i18n/config'
import { API_BASE, API_INTERNAL_URL, REVALIDATE_SECONDS } from '@/shared/config/env'

import type { components } from './schema'

export type Schemas = components['schemas']

/** Kesh teglari — backend `purge(tags)` bilan bir xil nomlar */
export const tags = {
  settings: 'settings',
  home: 'home',
  clinic: 'clinic',
  services: 'services',
  doctors: 'doctors',
  doctor: (slug: string) => `doctor:${slug}`,
  posts: 'posts',
  post: (slug: string) => `post:${slug}`,
  media: 'media',
} as const

type Query = Record<string, string | number | boolean | undefined | null>

/**
 * RSC uchun public GET. Next Data Cache'da teg bilan saqlanadi (ISR).
 * 404 → null (sahifa notFound() chaqiradi); boshqa xatolar — throw (error boundary).
 */
export async function apiGet<T>(
  path: string,
  { locale, query, tags: cacheTags = [], revalidate = REVALIDATE_SECONDS }: { locale?: Locale; query?: Query; tags?: string[]; revalidate?: number | false } = {},
): Promise<T | null> {
  const url = new URL(`${API_INTERNAL_URL}${API_BASE}${path}`)
  if (locale) url.searchParams.set('locale', locale)
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }
  const res = await fetch(url, {
    next: { tags: cacheTags, revalidate },
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`API ${res.status} ${path}`)
  return (await res.json()) as T
}
