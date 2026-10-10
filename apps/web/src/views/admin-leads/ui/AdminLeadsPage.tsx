'use client'

import { useQuery } from '@tanstack/react-query'

import { LeadDrawer } from '@/widgets/admin-lead-detail'
import { LeadsTable, MobileLeadCards } from '@/widgets/admin-leads-table'
import { NotificationBell, useMe } from '@/widgets/admin-shell'
import { ExportLeadsButton } from '@/features/admin-lead-export'
import { LeadFiltersBar, LeadStatusChips, LeadStatusFilter, useLeadFilters } from '@/features/admin-lead-filters'
import { leadListQuery, LEADS_PAGE_SIZE } from '@/entities/lead'
import { canExportLeads } from '@/entities/session'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { useIsMobile } from '@/shared/lib/hooks/useMediaQuery'
import { EmptyState, ErrorState } from '@/shared/ui/admin/EmptyState'
import { Pagination } from '@/shared/ui/admin/Pagination'
import { Skeleton } from '@/shared/ui/admin/Skeleton'
import { Topbar } from '@/shared/ui/admin/Topbar'
import { LogoMark } from '@/shared/ui/Logo'

/**
 * A3 (desktop) / A7 (mobil). Filtrlar URL'da, ro‘yxat har 15s yangilanadi (faqat tab ko‘rinib turganda),
 * sahifalashda oldingi ma’lumot ko‘rinib turadi (keepPreviousData).
 */
export function AdminLeadsPage() {
  const me = useMe()
  const mobile = useIsMobile()
  const f = useLeadFilters()
  const q = useQuery(leadListQuery(f.apiFilters))
  const takers = [...new Set((q.data?.items ?? []).map((r) => r.taken_by).filter((x): x is string => Boolean(x)))]

  if (mobile) {
    const items = q.data?.items ?? []
    return (
      <>
        <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line bg-white pr-2 pl-4">
          <LogoMark size={28} />
          <h1 className="m-0 text-[17px] font-semibold tracking-[-0.02em]">Arizalar</h1>
          <span className="ml-auto">
            <NotificationBell me={me} size={44} />
          </span>
        </header>
        <LeadStatusChips counts={q.data?.counts} />
        <main id="admin-main" aria-busy={q.isFetching} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {q.isPending ? (
            <div role="status" aria-label="Yuklanmoqda" className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-40 rounded-card" />
              ))}
            </div>
          ) : q.isError ? (
            <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
          ) : items.length ? (
            <MobileLeadCards items={items} />
          ) : (
            <EmptyState title="Bu status bo‘yicha ariza yo‘q" />
          )}
          <div className="mt-4 flex flex-col items-center gap-3">
            <Pagination page={f.page} pages={q.data?.pages ?? 1} onChange={f.setPage} />
            <div role="status" className="text-center text-xs text-ink-2">
              Ko‘rsatilgan: {items.length} ta · 15 daqiqadan oshganlari qizil
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Arizalar">{canExportLeads(me.role) && <ExportLeadsButton filters={{ status: f.apiFilters.status, date_from: f.apiFilters.date_from, date_to: f.apiFilters.date_to }} />}</Topbar>
        <main id="admin-main" className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-8 py-7">
          <LeadStatusFilter counts={q.data?.counts} />
          <LeadFiltersBar takers={takers} meName={me.name} />
          <LeadsTable
            data={q.data}
            isPending={q.isPending}
            isFetching={q.isFetching}
            error={q.error}
            onRetry={() => q.refetch()}
            page={f.page}
            pageSize={LEADS_PAGE_SIZE}
            onPage={f.setPage}
            onClearFilters={f.clear}
          />
        </main>
      </div>
      <LeadDrawer />
    </div>
  )
}
