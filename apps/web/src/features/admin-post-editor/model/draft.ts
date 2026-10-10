import { z } from 'zod'

import type { PostAdmin, PostInput, PostStatus } from '@/entities/admin-post'
import type { Media } from '@/entities/media'
import { cleanLt, emptyLText, fillState, toLt as lt, type ContentLocale } from '@/shared/lib/admin/ltext'

export type PostDraft = Omit<PostInput, 'cover_id'> & { cover_id: string | null; cover: Media | null }


export function toDraft(p?: PostAdmin | null): PostDraft {
  if (!p)
    return {
      slug: '',
      title: emptyLText(),
      excerpt: emptyLText(),
      body: emptyLText(),
      seo: { title: emptyLText(), description: emptyLText() },
      cover_id: null,
      cover: null,
      category_id: 0,
      author_id: null,
      status: 'draft',
      published_at: null,
      featured: false,
    }
  return {
    slug: p.slug,
    title: lt(p.title),
    excerpt: lt(p.excerpt),
    body: lt(p.body),
    seo: { title: lt(p.seo?.title), description: lt(p.seo?.description) },
    cover_id: p.cover_id ?? p.cover?.id ?? null,
    cover: p.cover,
    category_id: p.category_id,
    author_id: p.author_id,
    status: p.status,
    published_at: p.published_at,
    featured: p.featured,
  }
}

export function toPayload(d: PostDraft, status: PostStatus = d.status): PostInput {
  return {
    slug: d.slug.trim(),
    title: cleanLt(d.title),
    excerpt: cleanLt(d.excerpt),
    body: cleanLt(d.body),
    seo: { title: cleanLt(d.seo.title), description: cleanLt(d.seo.description) },
    cover_id: d.cover_id,
    category_id: d.category_id,
    author_id: d.author_id,
    status,
    published_at: status === 'draft' ? d.published_at : status === 'published' ? (d.published_at ?? new Date().toISOString()) : d.published_at,
    featured: d.featured,
  }
}

export const postSchema = z
  .object({
    title: z.object({ uz: z.string().trim().min(1, 'Sarlavhani kiriting').max(200, 'Sarlavha juda uzun') }),
    slug: z.string().regex(/^[a-z0-9-]{2,120}$/, 'Faqat lotin kichik harflar, raqam va «-» (2–120 belgi)'),
    category_id: z.number().int().min(1, 'Kategoriyani tanlang'),
    status: z.enum(['draft', 'scheduled', 'published']),
    published_at: z.string().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.status === 'scheduled' && (!v.published_at || new Date(v.published_at).getTime() <= Date.now()))
      ctx.addIssue({ code: 'custom', path: ['published_at'], message: 'Rejalashtirish uchun kelajakdagi sana va vaqtni kiriting' })
  })

export function localeFill(d: PostDraft) {
  const fields = [d.title, d.excerpt, d.body, d.seo.title, d.seo.description]
  const out = {} as Record<ContentLocale, ReturnType<typeof fillState>>
  for (const l of ['uz', 'ru', 'en'] as const) out[l] = fillState(fields, l)
  return out
}

export const WARNING_BLOCK = ':::warning Sarlavha\n- band\n:::'
