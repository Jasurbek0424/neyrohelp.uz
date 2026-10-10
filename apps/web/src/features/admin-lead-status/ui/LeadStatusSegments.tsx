'use client'

import { leadStatusChoices, leadStatusMeta, type LeadDetail } from '@/entities/lead'

import { useLeadActions } from '../model/useLeadActions'

/** Drawer'dagi status tugmalari (2 ustun, aria-pressed) */
export function LeadStatusSegments({ lead }: { lead: Pick<LeadDetail, 'id' | 'status'> }) {
  const { setStatus, updating } = useLeadActions()
  return (
    <div role="group" aria-labelledby="dr-status">
      <div id="dr-status" className="mb-1.5 text-[13px] font-medium text-ink-2">
        Status
      </div>
      <div className="grid grid-cols-2 gap-2">
        {leadStatusChoices.map((s) => {
          const on = lead.status === s
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              disabled={updating}
              onClick={() => !on && setStatus(lead, s)}
              className={`h-9 cursor-pointer rounded-control border text-sm font-medium disabled:cursor-wait ${on ? 'border-navy bg-navy text-white' : 'am-btn-o border-line-strong bg-white text-ink'}`}
            >
              {leadStatusMeta[s].label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
