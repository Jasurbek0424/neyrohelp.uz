'use client'

import { useQueryClient } from '@tanstack/react-query'

import { useBulkUpdateServices, type BulkItem } from '@/entities/admin-service'
import { dashboardKeys } from '@/entities/lead'
import { errorMessage, fieldErrorsFrom } from '@/shared/lib/admin/form-errors'
import { useUnsavedChangesGuard } from '@/shared/lib/hooks/useUnsavedChangesGuard'
import { AdminButton } from '@/shared/ui/admin/Button'
import { toast } from '@/shared/ui/admin/Toast'

import { selectDirtyCount, usePriceDrafts } from '../model/store'

/** Sticky saqlash paneli: «N ta o‘zgarish saqlanmagan» · Bekor qilish · Hammasini saqlash */
export function PriceSaveBar() {
  const qc = useQueryClient()
  const drafts = usePriceDrafts((s) => s.drafts)
  const count = usePriceDrafts(selectDirtyCount)
  const discard = usePriceDrafts((s) => s.discard)
  const bulk = useBulkUpdateServices()
  useUnsavedChangesGuard(count > 0)

  if (count === 0) return null

  const save = () => {
    const items: BulkItem[] = Object.entries(drafts).map(([id, d]) => ({ id: Number(id), ...d }))
    bulk.mutate(items, {
      onSuccess: () => {
        discard()
        void qc.invalidateQueries({ queryKey: dashboardKeys.all })
        toast.success(`${items.length} ta xizmat saqlandi — saytda yangilandi`)
      },
      onError: (e) => {
        const fields = Object.keys(fieldErrorsFrom(e))
        toast.error(fields.length ? `Ba’zi qiymatlar noto‘g‘ri (${fields.length} ta). Davomiylik 1–1440 daqiqa, narx musbat son bo‘lishi kerak.` : errorMessage(e))
      },
    })
  }

  return (
    <div role="status" className="flex h-16 shrink-0 items-center gap-3 rounded-card border border-field bg-white px-5">
      <span aria-hidden className="size-2 rounded-full bg-(--am-warn-dot)" />
      <span className="text-sm font-semibold">{count} ta o‘zgarish saqlanmagan</span>
      <AdminButton className="ml-auto" onClick={discard} disabled={bulk.isPending}>
        Bekor qilish
      </AdminButton>
      <AdminButton variant="primary" className="px-5" onClick={save} disabled={bulk.isPending}>
        {bulk.isPending ? 'Saqlanmoqda…' : 'Hammasini saqlash'}
      </AdminButton>
    </div>
  )
}
