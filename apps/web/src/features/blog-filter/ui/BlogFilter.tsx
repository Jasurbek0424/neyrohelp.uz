'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, type FormEvent, type ReactNode } from 'react'

import { Pagination } from '@/shared/ui/Pagination'

import { blogHref, matchesQuery, parseBlogFilter, type BlogFilter as Filter } from '../model/params'
import { BlogToolbar } from './BlogToolbar'

export type BlogFilterItem = {
  key: string | number
  category: string
  /** Qidiruv uchun matn (sarlavha + qisqa tavsif) */
  text: string
  /** Server'da render qilingan karta (RSC) */
  node: ReactNode
}

type Props = {
  basePath: string
  categories: { slug: string; title: string }[]
  /** Tanlangan maqola (faqat filtrsiz 1-sahifada ko‘rinadi) */
  featured?: { key: string | number; node: ReactNode } | null
  items: BlogFilterItem[]
  pageSize: number
  labels: {
    all: string
    nav: string
    list: string
    search: string
    searchPlaceholder: string
    empty: string
    pagination: string
    prev: string
    next: string
  }
}

/**
 * Blog ro‘yxati. Sahifa statik (SSG/ISR): HTML'da filtrsiz 1-sahifa bor (SEO, JS'siz ham ishlaydi),
 * `?kategoriya=`, `?q=`, `?sahifa=` brauzerda o‘qiladi — ro‘yxat server so‘rovisiz filtrlanadi.
 */
export function BlogFilter(props: Props) {
  return (
    <Suspense fallback={<BlogView {...props} filter={{ page: 1 }} />}>
      <WithParams {...props} />
    </Suspense>
  )
}

function WithParams(props: Props) {
  const params = useSearchParams()
  const raw = parseBlogFilter(Object.fromEntries(params.entries()))
  const category = props.categories.find((c) => c.slug === raw.category)?.slug
  return <BlogView {...props} filter={{ ...raw, category }} interactive />
}

function BlogView({ basePath, categories, featured, items, pageSize, labels, filter, interactive }: Props & { filter: Filter; interactive?: boolean }) {
  const router = useRouter()
  const { category, q } = filter
  const plain = !category && !q

  const showFeatured = Boolean(featured) && plain && filter.page === 1
  const pool = items.filter((i) => (!category || i.category === category) && (!q || matchesQuery(i.text, q)) && (plain ? i.key !== featured?.key : true))
  const totalPages = Math.max(1, Math.ceil(pool.length / pageSize))
  const page = Math.min(filter.page, totalPages)
  const visible = pool.slice((page - 1) * pageSize, page * pageSize)

  function onSearch(e: FormEvent<HTMLFormElement>) {
    if (!interactive) return
    e.preventDefault()
    const value = String(new FormData(e.currentTarget).get('q') ?? '')
      .replace(/\s+/g, ' ')
      .trim()
    router.push(blogHref(basePath, { category, q: value.length >= 2 ? value : undefined }), { scroll: false })
  }

  return (
    <>
      <div className="container-site">
        <BlogToolbar
          key={q ?? ''}
          basePath={basePath}
          categories={categories}
          activeSlug={category}
          query={q}
          onSearch={onSearch}
          labels={{ all: labels.all, nav: labels.nav, search: labels.search, placeholder: labels.searchPlaceholder }}
        />
        <div className="border-b border-ink" />
      </div>

      {showFeatured ? featured?.node : null}

      <section aria-label={labels.list} className="container-site py-12 lg:py-16">
        {visible.length ? (
          <>
            <ul className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <li key={p.key}>{p.node}</li>
              ))}
            </ul>
            <Pagination
              page={page}
              totalPages={totalPages}
              hrefFor={(n) => blogHref(basePath, { category, q, page: n })}
              label={labels.pagination}
              prevLabel={labels.prev}
              nextLabel={labels.next}
            />
          </>
        ) : (
          <p role="status" className="py-16 text-center text-lg text-ink-2">
            {labels.empty}
          </p>
        )}
      </section>
    </>
  )
}
