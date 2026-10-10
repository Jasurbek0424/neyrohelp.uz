'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { postCategoriesQuery, postDetailQuery, postListQuery, PostStatusTag, type PostStatus } from '@/entities/admin-post'
import { adminPaths } from '@/entities/session'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { ltOr } from '@/shared/lib/admin/ltext'
import { relativeDayTime, shortDate } from '@/shared/lib/admin/time'
import { useDebouncedValue } from '@/shared/lib/hooks/useDebouncedValue'
import { useUrlState } from '@/shared/lib/hooks/useUrlState'
import { AdminButtonLink } from '@/shared/ui/admin/Button'
import { EmptyState, ErrorState } from '@/shared/ui/admin/EmptyState'
import { Select } from '@/shared/ui/admin/Field'
import { ChevronIcon, PlusIcon } from '@/shared/ui/admin/icons'
import { FillDots } from '@/shared/ui/admin/LocaleTabs'
import { Pagination } from '@/shared/ui/admin/Pagination'
import { SearchField } from '@/shared/ui/admin/SearchField'
import { SkeletonRows } from '@/shared/ui/admin/Skeleton'
import { StatusTag } from '@/shared/ui/admin/StatusTag'
import { Tabs } from '@/shared/ui/admin/Tabs'
import { SiteLink, Topbar } from '@/shared/ui/admin/Topbar'

const KEYS = ['status', 'cat', 'q', 'page'] as const
const PAGE_SIZE = 20
const statuses: PostStatus[] = ['published', 'draft', 'scheduled']
const tabLabels: Record<'all' | PostStatus, string> = { all: 'Barchasi', published: 'Nashrda', draft: 'Qoralama', scheduled: 'Rejalashtirilgan' }

/** Maqolalar: server tomonda filtr + sahifalash (keepPreviousData), filtrlar URL'da */
export function AdminPostsPage() {
  const qc = useQueryClient()
  const [url, setUrl] = useUrlState(KEYS)
  const status = statuses.includes(url.status as PostStatus) ? (url.status as PostStatus) : undefined
  const page = Math.max(1, Number(url.page) || 1)
  const [search, setSearch] = useState(url.q)
  const debounced = useDebouncedValue(search, 300)
  useEffect(() => {
    if (debounced !== url.q) setUrl({ q: debounced, page: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const categories = useQuery(postCategoriesQuery())
  const q = useQuery(postListQuery({ status, category_id: Number(url.cat) || undefined, q: url.q.trim() || undefined, page, limit: PAGE_SIZE }))
  const catTitle = (id: number) => ltOr(categories.data?.find((c) => c.id === id)?.title) || '—'
  const items = q.data?.items ?? []

  return (
    <>
      <Topbar title="Maqolalar">
        <SiteLink href="/uz/blog" className="max-sm:hidden" />
        <AdminButtonLink href={adminPaths.postNew} variant="primary">
          <PlusIcon />
          Yangi maqola
        </AdminButtonLink>
      </Topbar>
      <main id="admin-main" className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-8 py-7 max-md:px-4 max-md:py-4">
        <Tabs<'all' | PostStatus>
          asFilter
          label="Holat bo‘yicha filtr"
          height={44}
          value={status ?? 'all'}
          onChange={(v) => setUrl({ status: v === 'all' ? null : v, page: null })}
          tabs={(['all', ...statuses] as const).map((s) => ({ value: s, label: tabLabels[s] }))}
        />
        <div className="flex flex-wrap items-center gap-2">
          <SearchField label="Sarlavha bo‘yicha qidirish" placeholder="Sarlavha bo‘yicha qidirish" wrapperClassName="w-[320px] max-md:w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select aria-label="Kategoriya" wrapperClassName="w-56 max-md:w-full" value={url.cat} onChange={(e) => setUrl({ cat: e.target.value, page: null })}>
            <option value="">Kategoriya: Hammasi</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {ltOr(c.title)}
              </option>
            ))}
          </Select>
        </div>

        <section aria-label="Maqolalar ro‘yxati" aria-busy={q.isFetching} className="overflow-hidden rounded-card border border-line bg-white">
          {q.isPending ? (
            <SkeletonRows rows={8} />
          ) : q.isError ? (
            <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
          ) : !items.length ? (
            <EmptyState
              title={status || url.q || url.cat ? 'Hech narsa topilmadi' : 'Hali maqola yo‘q'}
              action={
                <AdminButtonLink href={adminPaths.postNew} variant="primary">
                  Yangi maqola
                </AdminButtonLink>
              }
            />
          ) : (
            <table className="w-full table-fixed border-collapse text-sm">
              <thead className="bg-(--am-bg) text-left text-xs font-medium text-ink-2">
                <tr className="h-10">
                  <th scope="col" className="border-b border-line pl-4 font-medium">
                    Sarlavha
                  </th>
                  <th scope="col" className="w-[180px] border-b border-line px-3 font-medium max-lg:hidden">
                    Kategoriya
                  </th>
                  <th scope="col" className="w-[150px] border-b border-line px-3 font-medium">
                    Holat
                  </th>
                  <th scope="col" className="w-[90px] border-b border-line px-3 font-medium max-md:hidden">
                    Tarjima
                  </th>
                  <th scope="col" className="w-[150px] border-b border-line px-3 text-right font-medium max-md:hidden">
                    O‘zgartirildi
                  </th>
                  <th scope="col" className="w-10 border-b border-line pr-4">
                    <span className="sr-only">Ochish</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="am-row relative h-14 cursor-pointer" onMouseEnter={() => void qc.prefetchQuery(postDetailQuery(p.id))}>
                    <td className="min-w-0 border-b border-line pl-4">
                      <div className="flex items-center gap-2">
                        <Link href={adminPaths.post(p.id)} className="truncate font-semibold after:absolute after:inset-0 after:content-['']">
                          {ltOr(p.title) || 'Nomsiz maqola'}
                        </Link>
                        {p.featured && <StatusTag tone="coral">Tanlangan</StatusTag>}
                      </div>
                      <div className="truncate text-[13px] text-ink-2">/blog/{p.slug}</div>
                    </td>
                    <td className="truncate border-b border-line px-3 text-ink-2 max-lg:hidden">{catTitle(p.category_id)}</td>
                    <td className="border-b border-line px-3">
                      <PostStatusTag status={p.status} label={p.status === 'scheduled' && p.published_at ? `${shortDate(p.published_at)} da` : undefined} />
                    </td>
                    <td className="border-b border-line px-3 max-md:hidden">
                      <FillDots value={p.completeness} />
                    </td>
                    <td className="border-b border-line px-3 text-right text-[13px] text-ink-2 tabular-nums max-md:hidden">{relativeDayTime(p.updated_at)}</td>
                    <td className="border-b border-line pr-4 text-ink-2">
                      <ChevronIcon dir="right" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {q.data && q.data.total > 0 && (
            <div className="flex h-[52px] items-center justify-between gap-3 px-4">
              <span className="text-[13px] text-ink-2">Jami: {q.data.total} ta</span>
              <Pagination page={page} pages={q.data.pages} onChange={(p) => setUrl({ page: p === 1 ? null : p })} />
            </div>
          )}
        </section>
      </main>
    </>
  )
}
