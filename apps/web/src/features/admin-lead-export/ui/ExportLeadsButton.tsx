'use client'

import { useMutation } from '@tanstack/react-query'

import { downloadLeadsExport, type LeadExportFilters } from '@/entities/lead'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { AdminButton } from '@/shared/ui/admin/Button'
import { Icon } from '@/shared/ui/admin/icons'
import { toast } from '@/shared/ui/admin/Toast'

/** Faqat admin uchun ko‘rsatiladi (backend ham tekshiradi + audit log) */
export function ExportLeadsButton({ filters }: { filters: LeadExportFilters }) {
  const m = useMutation({
    mutationFn: () => downloadLeadsExport(filters),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('Excel fayl yuklab olindi')
    },
    onError: (e) => toast.error(errorMessage(e, 'Eksport qilib bo‘lmadi')),
  })
  return (
    <AdminButton onClick={() => m.mutate()} disabled={m.isPending} aria-busy={m.isPending}>
      <Icon name="download" size={16} strokeWidth={1.7} />
      {m.isPending ? 'Tayyorlanmoqda…' : 'Excel‘ga eksport'}
    </AdminButton>
  )
}
