'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useLeadDrawer } from '@/features/admin-lead-drawer'
import { leadDetailQuery } from '@/entities/lead'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { Drawer } from '@/shared/ui/admin/Drawer'
import { ErrorState } from '@/shared/ui/admin/EmptyState'
import { Skeleton } from '@/shared/ui/admin/Skeleton'

import { LeadDetailBody } from './LeadDetailBody'

/** Arizalar ro‘yxati yonidagi panel (inline <dialog>): tanlangan ariza Zustand'da, ma’lumot TanStack'da */
export function LeadDrawer() {
  const open = useLeadDrawer((s) => s.open)
  const id = useLeadDrawer((s) => s.selectedId)
  const close = useLeadDrawer((s) => s.close)
  const q = useQuery({ ...leadDetailQuery(id ?? 0), enabled: open && id !== null })

  // Esc fokus qayerda bo‘lmasin (masalan, saqlangach tugma disabled bo‘lib fokus body'ga tushganda) panelni yopadi;
  // modal oyna (tasdiqlash) ochiq bo‘lsa — u o‘zi yopiladi
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('dialog[open]:modal')) return
      close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])
  return (
    <Drawer open={open && id !== null} onClose={close} title={id ? `Ariza #${id}` : 'Ariza'}>
      {q.data && q.data.id === id ? (
        <LeadDetailBody lead={q.data} />
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <div role="status" aria-label="Yuklanmoqda" className="flex flex-col gap-4">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}
    </Drawer>
  )
}
