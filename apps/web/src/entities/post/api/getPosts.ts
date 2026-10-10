import 'server-only'

import { apiGet, tags } from '@/shared/api/server'
import { locales, type Locale } from '@/shared/i18n/config'

import type { Post, PostCardData, PostCategory, PostPage } from '../model/types'

type ListOptions = { category?: string; q?: string; page?: number; limit?: number; featured?: boolean; exclude?: number }

const EMPTY: PostPage = { items: [], total: 0, page: 1, pages: 0 }

export async function getPosts(locale: Locale, { category, q, page, limit, featured, exclude }: ListOptions = {}): Promise<PostPage> {
  return (
    (await apiGet<PostPage>('/public/posts', {
      locale,
      query: { category, q, page, limit, featured: featured || undefined, exclude },
      tags: [tags.posts],
    })) ?? EMPTY
  )
}

/** Barcha nashr qilingan maqolalar (API limiti 24 — sahifalab olinadi). Blog ro‘yxati statik render qilinadi */
export async function getAllPosts(locale: Locale, maxPages = 20): Promise<PostCardData[]> {
  const first = await getPosts(locale, { page: 1, limit: 24 })
  const rest = await Promise.all(
    Array.from({ length: Math.min(first.pages, maxPages) - 1 }, (_, i) => getPosts(locale, { page: i + 2, limit: 24 })),
  )
  return [first, ...rest].flatMap((p) => p.items)
}

/** null — maqola topilmadi. `translated: false` — tanlangan tilda tarjima yo‘q (uz matni qaytgan) */
export function getPost(slug: string, locale: Locale): Promise<Post | null> {
  return apiGet<Post>(`/public/posts/${encodeURIComponent(slug)}`, { locale, tags: [tags.posts, tags.post(slug)] })
}

/** Maqola qaysi tillarda haqiqatan mavjud (hreflang, sitemap). uz — har doim asosiy til */
export async function getPostLocales(slug: string): Promise<Locale[]> {
  const results = await Promise.all(locales.map(async (l) => [l, l === 'uz' ? true : (await getPost(slug, l))?.translated === true] as const))
  return results.filter(([, ok]) => ok).map(([l]) => l)
}

export async function getPostCategories(locale: Locale): Promise<PostCategory[]> {
  return (await apiGet<PostCategory[]>('/public/post-categories', { locale, tags: [tags.posts] })) ?? []
}
