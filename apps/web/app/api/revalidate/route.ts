import { timingSafeEqual } from 'node:crypto'

import { revalidateTag } from 'next/cache'

/**
 * Backend kontent o‘zgarganda chaqiradi: POST {tags: string[]} + x-revalidate-secret.
 * Faqat ichki tarmoqdan (Caddy bu yo‘lni tashqariga ochmaydi).
 */
export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET ?? ''
  const got = request.headers.get('x-revalidate-secret') ?? ''
  const ok = expected.length >= 16 && got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected))
  if (!ok) return new Response('forbidden', { status: 403 })

  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null
  const list = Array.isArray(body?.tags) ? body.tags.filter((t): t is string => typeof t === 'string' && /^[a-z0-9:-]{1,120}$/.test(t)) : []
  for (const tag of list.slice(0, 50)) revalidateTag(tag, 'max')
  return Response.json({ revalidated: list.length })
}
