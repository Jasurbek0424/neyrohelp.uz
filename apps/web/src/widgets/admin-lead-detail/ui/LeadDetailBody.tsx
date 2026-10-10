'use client'

import { LeadNoteForm, LeadStatusSegments, TakeLeadButton } from '@/features/admin-lead-status'
import { eventPage, isLate, LeadHistory, LeadStatusTag, localeLabels, type LeadDetail } from '@/entities/lead'
import { leadTime } from '@/shared/lib/admin/time'
import { useNow } from '@/shared/lib/hooks/useNow'
import { formatUzPhone } from '@/shared/lib/phone'
import { Icon } from '@/shared/ui/admin/icons'

import { CopyPhoneButton } from './CopyPhoneButton'

/** Drawer (A3) tarkibi: bemor, telefon, shikoyat, status, izoh, tarix */
export function LeadDetailBody({ lead }: { lead: LeadDetail }) {
  const now = useNow(30_000)
  const late = isLate(lead, now)
  const created = lead.events.find((e) => e.kind === 'created')
  const page = lead.page || (created ? eventPage(created) : '') || '—'
  return (
    <>
      <div>
        <div className="text-[22px] leading-tight font-semibold tracking-[-0.01em]">{lead.full_name}</div>
        <div className="mt-2 flex items-center gap-2.5">
          <LeadStatusTag status={lead.status} />
          <span className={`text-[13px] ${late ? 'font-semibold text-coral-ink' : 'text-ink-2'}`}>{leadTime(lead.created_at, now)}</span>
          {lead.taken_by && <span className="truncate text-[13px] text-ink-2">· {lead.taken_by}</span>}
        </div>
      </div>

      <div>
        <div className="text-xl leading-7 font-semibold tabular-nums">{formatUzPhone(lead.phone)}</div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <a href={`tel:${lead.phone}`} className="am-btn flex h-10 items-center gap-2 rounded-control bg-navy px-4 text-sm font-medium text-white">
            <Icon name="phone" size={16} strokeWidth={1.7} />
            Qo‘ng‘iroq qilish
          </a>
          <CopyPhoneButton phone={formatUzPhone(lead.phone)} />
          {lead.status === 'new' && <TakeLeadButton lead={lead} size="md" className="ml-auto" />}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[13px] font-medium text-ink-2">Shikoyat</div>
        <div className="rounded-control bg-sand p-3.5 text-sm leading-[1.55] whitespace-pre-line">{lead.message?.trim() || <span className="text-ink-2">Shikoyat yozilmagan</span>}</div>
      </div>

      <LeadStatusSegments lead={lead} />
      <LeadNoteForm key={lead.id} lead={lead} />

      <div>
        <div className="mb-2 text-[13px] font-medium text-ink-2">Tarix</div>
        <LeadHistory events={lead.events} />
      </div>

      <div className="mt-auto border-t border-line pt-3 text-xs text-ink-2">
        Manba: {page} · Til: {localeLabels[lead.locale] ?? lead.locale} · Rozilik: {lead.consent ? 'berilgan' : 'yo‘q'}
      </div>
    </>
  )
}
