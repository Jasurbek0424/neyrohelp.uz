'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useMemo } from 'react'

import { audienceLabels, doctorDetailQuery, doctorListQuery, type DoctorListItem } from '@/entities/admin-doctor'
import { MediaThumb } from '@/entities/media'
import { adminPaths } from '@/entities/session'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { useUrlState } from '@/shared/lib/hooks/useUrlState'
import { AdminButtonLink } from '@/shared/ui/admin/Button'
import { EmptyState, ErrorState } from '@/shared/ui/admin/EmptyState'
import { ChevronIcon, PlusIcon } from '@/shared/ui/admin/icons'
import { FillDots } from '@/shared/ui/admin/LocaleTabs'
import { SearchField } from '@/shared/ui/admin/SearchField'
import { Segmented } from '@/shared/ui/admin/Segmented'
import { SkeletonRows } from '@/shared/ui/admin/Skeleton'
import { StatusTag } from '@/shared/ui/admin/StatusTag'
import { SiteLink, Topbar } from '@/shared/ui/admin/Topbar'

type Filter = 'all' | 'published' | 'hidden' | 'nophoto'
const KEYS = ['q', 'f'] as const

const filters: Record<Filter, (d: DoctorListItem) => boolean> = {
  all: () => true,
  published: (d) => d.is_published,
  hidden: (d) => !d.is_published,
  nophoto: (d) => !d.photo,
}

/** Shifokorlar ro‘yxati: qidiruv va filtr URL'da, qator ustida — profil oldindan yuklanadi */
export function AdminDoctorsPage() {
  const qc = useQueryClient()
  const q = useQuery(doctorListQuery())
  const [url, setUrl] = useUrlState(KEYS)
  const filter: Filter = (Object.keys(filters) as Filter[]).includes(url.f as Filter) ? (url.f as Filter) : 'all'
  const needle = url.q.trim().toLowerCase()

  const rows = useMemo(
    () =>
      (q.data ?? [])
        .filter(filters[filter])
        .filter((d) => !needle || d.full_name.toLowerCase().includes(needle) || d.specialty_title.toLowerCase().includes(needle) || d.slug.includes(needle))
        .sort((a, b) => a.order - b.order || a.full_name.localeCompare(b.full_name)),
    [q.data, filter, needle],
  )
  const count = (f: Filter) => (q.data ?? []).filter(filters[f]).length

  return (
    <>
      <Topbar title="Shifokorlar">
        <SiteLink href="/uz/shifokorlar" className="max-sm:hidden" />
        <AdminButtonLink href={adminPaths.doctorNew} variant="primary">
          <PlusIcon />
          Shifokor qo‘shish
        </AdminButtonLink>
      </Topbar>
      <main id="admin-main" className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-8 py-7 max-md:px-4 max-md:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchField
            label="Shifokorlarni qidirish"
            placeholder="Ism yoki mutaxassislik"
            wrapperClassName="w-[320px] max-md:w-full"
            defaultValue={url.q}
            onChange={(e) => setUrl({ q: e.target.value })}
          />
          <Segmented<Filter>
            label="Holat bo‘yicha filtr"
            value={filter}
            onChange={(v) => setUrl({ f: v === 'all' ? null : v })}
            className="max-md:w-full max-md:overflow-x-auto"
            itemClassName="px-4 max-md:px-3 max-md:text-[13px]"
            options={[
              { value: 'all', label: `Barchasi ${q.data ? count('all') : ''}` },
              { value: 'published', label: `Nashrda ${q.data ? count('published') : ''}` },
              { value: 'hidden', label: `Yashirin ${q.data ? count('hidden') : ''}` },
              { value: 'nophoto', label: `Portretsiz ${q.data ? count('nophoto') : ''}` },
            ]}
          />
        </div>

        <section aria-label="Shifokorlar ro‘yxati" className="overflow-hidden rounded-card border border-line bg-white">
          {q.isPending ? (
            <SkeletonRows rows={6} height={72} />
          ) : q.isError ? (
            <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
          ) : !rows.length ? (
            <EmptyState
              title={q.data.length ? 'Hech narsa topilmadi' : 'Hali shifokor qo‘shilmagan'}
              action={
                !q.data.length && (
                  <AdminButtonLink href={adminPaths.doctorNew} variant="primary">
                    Shifokor qo‘shish
                  </AdminButtonLink>
                )
              }
            >
              {q.data.length ? 'Qidiruv yoki filtrni o‘zgartiring.' : undefined}
            </EmptyState>
          ) : (
            <table className="w-full table-fixed border-collapse text-sm">
              <thead className="bg-(--am-bg) text-left text-xs font-medium text-ink-2">
                <tr className="h-10">
                  <th scope="col" className="w-[72px] border-b border-line pl-4 font-medium">
                    <span className="sr-only">Portret</span>
                  </th>
                  <th scope="col" className="border-b border-line px-3 font-medium">
                    Shifokor
                  </th>
                  <th scope="col" className="w-[200px] border-b border-line px-3 font-medium max-lg:hidden">
                    Mutaxassislik
                  </th>
                  <th scope="col" className="w-[110px] border-b border-line px-3 font-medium max-xl:hidden">
                    Qabul qiladi
                  </th>
                  <th scope="col" className="w-[96px] border-b border-line px-3 text-right font-medium max-xl:hidden">
                    Tajriba
                  </th>
                  <th scope="col" className="w-[90px] border-b border-line px-3 font-medium max-md:hidden">
                    Tarjima
                  </th>
                  <th scope="col" className="w-[220px] border-b border-line px-3 font-medium max-md:w-[110px]">
                    Holat
                  </th>
                  <th scope="col" className="w-10 border-b border-line pr-4">
                    <span className="sr-only">Ochish</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const href = adminPaths.doctor(d.id)
                  return (
                    <tr key={d.id} className="am-row relative h-[72px] cursor-pointer" onMouseEnter={() => void qc.prefetchQuery(doctorDetailQuery(d.id))}>
                      <td className="border-b border-line pl-4">
                        <MediaThumb media={d.photo} width={40} height={52} rounded={4} />
                      </td>
                      <td className="min-w-0 border-b border-line px-3">
                        {/* butun qator — havola (after: psevdo-element qatorni qoplaydi) */}
                        <Link href={href} className="block truncate font-semibold after:absolute after:inset-0 after:content-['']">
                          {d.full_name}
                        </Link>
                        <div className="truncate text-[13px] text-ink-2">/{d.slug}</div>
                      </td>
                      <td className="truncate border-b border-line px-3 max-lg:hidden">{d.specialty_title}</td>
                      <td className="border-b border-line px-3 text-ink-2 max-xl:hidden">{audienceLabels[d.audience]}</td>
                      <td className="border-b border-line px-3 text-right tabular-nums max-xl:hidden">{d.experience_years !== null ? `${d.experience_years} yil` : '—'}</td>
                      <td className="border-b border-line px-3 max-md:hidden">
                        <FillDots value={d.completeness} />
                      </td>
                      <td className="border-b border-line px-3">
                        <span className="flex gap-1.5">
                          {d.is_published ? <StatusTag tone="ok">Nashrda</StatusTag> : <StatusTag tone="warn">Yashirin</StatusTag>}
                          {d.show_on_home && (
                            <StatusTag tone="navy" className="max-md:hidden">
                              Bosh sahifada
                            </StatusTag>
                          )}
                        </span>
                      </td>
                      <td className="border-b border-line pr-4 text-ink-2">
                        <ChevronIcon dir="right" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  )
}
