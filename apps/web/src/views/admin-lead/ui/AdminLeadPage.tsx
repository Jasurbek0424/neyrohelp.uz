'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

import { LeadDetailBody, MobileLeadDetail } from '@/widgets/admin-lead-detail'
import { leadDetailQuery } from '@/entities/lead'
import { adminPaths } from '@/entities/session'
import { ApiError } from '@/shared/api/client'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { useIsMobile } from '@/shared/lib/hooks/useMediaQuery'
import { EmptyState, ErrorState } from '@/shared/ui/admin/EmptyState'
import { Icon } from '@/shared/ui/admin/icons'
import { Skeleton } from '@/shared/ui/admin/Skeleton'
import { Topbar } from '@/shared/ui/admin/Topbar'

/** /admin/arizalar/[id]: mobil (A8) — to‘liq ekran; desktop — markazdagi karta */
export function AdminLeadPage({ id }: { id: number }) {
  const mobile = useIsMobile()
  const q = useQuery({ ...leadDetailQuery(id), enabled: Number.isInteger(id) && id > 0 })
  const notFound = !Number.isInteger(id) || id <= 0 || (q.error instanceof ApiError && q.error.status === 404)

  const body = notFound ? (
    <EmptyState
      title="Ariza topilmadi"
      action={
        <Link href={adminPaths.leads} className="am-link text-sm font-medium">
          Arizalar ro‘yxatiga qaytish
        </Link>
      }
    >
      O‘chirilgan yoki manzil noto‘g‘ri bo‘lishi mumkin.
    </EmptyState>
  ) : q.isError ? (
    <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
  ) : !q.data ? (
    <div role="status" aria-label="Yuklanmoqda" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-13 w-full" />
      <Skeleton className="h-13 w-full" />
      <Skeleton className="h-32 w-full rounded-card" />
    </div>
  ) : mobile ? (
    <MobileLeadDetail lead={q.data} />
  ) : (
    <div className="flex flex-col gap-4">
      <LeadDetailBody lead={q.data} />
    </div>
  )

  if (mobile) {
    return (
      <>
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line bg-white pr-4 pl-2">
          <Link href={adminPaths.leads} aria-label="Arizalar ro‘yxatiga qaytish" className="am-btn-o flex size-11 items-center justify-center rounded-control">
            <Icon name="back" size={22} strokeWidth={1.8} />
          </Link>
          <h1 className="m-0 text-[17px] font-semibold tracking-[-0.02em]">Ariza #{id}</h1>
        </header>
        <main id="admin-main" className="min-h-0 flex-1 overflow-y-auto px-4 pt-5">
          {body}
        </main>
      </>
    )
  }

  return (
    <>
      <Topbar crumbs={[{ label: 'Arizalar', href: adminPaths.leads }, { label: `Ariza #${id}` }]} />
      <main id="admin-main" className="min-h-0 flex-1 overflow-auto px-8 py-7">
        <div className="mx-auto max-w-[560px] rounded-card border border-line bg-white p-6">{body}</div>
      </main>
    </>
  )
}
