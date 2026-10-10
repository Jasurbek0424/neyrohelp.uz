'use client'

import type { LeadRow } from '@/entities/lead'

import { useLeadActions } from '../model/useLeadActions'

export function TakeLeadButton({ lead, size = 'sm', className = '' }: { lead: Pick<LeadRow, 'id' | 'full_name'>; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const { takeLead, takingId } = useLeadActions()
  const busy = takingId === lead.id
  const h = size === 'sm' ? 'h-8 px-3 text-[13px]' : size === 'md' ? 'h-10 px-4 text-sm' : 'h-9 px-[18px] text-sm'
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        void takeLead(lead)
      }}
      disabled={busy}
      aria-label={`Arizani olish: ${lead.full_name}`}
      className={`am-btn flex shrink-0 cursor-pointer items-center rounded-control border-0 bg-navy font-medium text-white disabled:opacity-60 ${h} ${className}`}
    >
      {busy ? 'Olinmoqda…' : 'Olish'}
    </button>
  )
}
