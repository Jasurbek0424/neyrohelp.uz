'use client'

import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import { doctorDetailQuery } from '@/entities/admin-doctor'
import { adminPaths } from '@/entities/session'
import { ApiError } from '@/shared/api/client'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { EmptyState, ErrorState } from '@/shared/ui/admin/EmptyState'
import { Skeleton } from '@/shared/ui/admin/Skeleton'
import { Topbar } from '@/shared/ui/admin/Topbar'

function FormSkeleton() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Shifokorlar', href: adminPaths.doctors }, { label: '…' }]} />
      <div role="status" aria-label="Yuklanmoqda" className="flex flex-col gap-4 px-8 pt-7 max-md:px-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-10 w-full max-w-[920px]" />
        <div className="grid grid-cols-[minmax(0,620px)_300px] gap-6 max-lg:grid-cols-1">
          <Skeleton className="h-[520px] rounded-card" />
          <Skeleton className="h-[320px] rounded-card" />
        </div>
      </div>
    </>
  )
}

/** Forma (tablar, yuklash, tarjimalar) og‘ir — alohida chunk */
const DoctorForm = dynamic(() => import('@/features/admin-doctor-form').then((m) => m.DoctorForm), { ssr: false, loading: FormSkeleton })

/** A4: shifokor profili. id yo‘q — yangi shifokor */
export function AdminDoctorPage({ id }: { id?: number }) {
  const valid = id === undefined || (Number.isInteger(id) && id > 0)
  const q = useQuery({ ...doctorDetailQuery(id ?? 0), enabled: id !== undefined && valid })

  if (id === undefined) return <DoctorForm />
  if (!valid || (q.error instanceof ApiError && q.error.status === 404)) {
    return (
      <>
        <Topbar crumbs={[{ label: 'Shifokorlar', href: adminPaths.doctors }, { label: 'Topilmadi' }]} />
        <main id="admin-main" className="flex flex-1 items-center justify-center">
          <EmptyState
            title="Shifokor topilmadi"
            action={
              <Link href={adminPaths.doctors} className="am-link text-sm font-medium">
                Ro‘yxatga qaytish
              </Link>
            }
          />
        </main>
      </>
    )
  }
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
  if (!q.data) return <FormSkeleton />
  return <DoctorForm key={q.data.id} doctor={q.data} />
}
