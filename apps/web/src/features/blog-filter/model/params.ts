/** URL search params → xavfsiz qiymatlar (slug ^[a-z0-9-]+$, q 2..80, sahifa ≤ 500) */
export type BlogFilter = { category?: string; q?: string; page: number }

export const CATEGORY_PARAM = 'kategoriya'

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function parseBlogFilter(sp: Record<string, string | string[] | undefined>): BlogFilter {
  const rawCategory = one(sp[CATEGORY_PARAM])?.trim().toLowerCase()
  const category = rawCategory && /^[a-z0-9-]{1,80}$/.test(rawCategory) ? rawCategory : undefined
  const rawQ = one(sp.q)?.replace(/\s+/g, ' ').trim().slice(0, 80)
  const q = rawQ && rawQ.length >= 2 ? rawQ : undefined
  const n = Number.parseInt(one(sp.sahifa) ?? '1', 10)
  const page = Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 1
  return { category, q, page }
}

export function blogHref(basePath: string, { category, q, page }: Partial<BlogFilter>): string {
  const p = new URLSearchParams()
  if (category) p.set(CATEGORY_PARAM, category)
  if (q) p.set('q', q)
  if (page && page > 1) p.set('sahifa', String(page))
  const s = p.toString()
  return s ? `${basePath}?${s}` : basePath
}

/** Qidiruv uchun normallashtirish: kichik harf, o‘zbekcha apostrof variantlari bitta belgiga */
export const normalizeSearch = (s: string) =>
  s
    .toLocaleLowerCase()
    .replace(/[‘’ʻʼ`´']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

/** Barcha so‘zlar matnda bo‘lsa — mos */
export function matchesQuery(text: string, q: string): boolean {
  const hay = normalizeSearch(text)
  return normalizeSearch(q)
    .split(' ')
    .filter(Boolean)
    .every((w) => hay.includes(w))
}
