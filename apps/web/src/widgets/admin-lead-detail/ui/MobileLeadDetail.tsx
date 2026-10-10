'use client'

import { MobileLeadForm } from '@/features/admin-lead-status'
import { isLate, LeadHistory, LeadStatusTag, type LeadDetail } from '@/entities/lead'
import { minutesSince, relativeDayTime } from '@/shared/lib/admin/time'
import { useNow } from '@/shared/lib/hooks/useNow'
import { formatUzPhone } from '@/shared/lib/phone'
import { Icon } from '@/shared/ui/admin/icons'

/** A8: operator telefondan — katta tugmalar, natija + izoh, pastda sticky «Saqlash» */
export function MobileLeadDetail({ lead }: { lead: LeadDetail }) {
  const now = useNow(30_000)
  const late = isLate(lead, now)
  const waiting = lead.status === 'new' ? minutesSince(lead.created_at, now) : null
  return (
    <div className="pb-28">
      <h2 className="m-0 text-2xl leading-tight font-semibold tracking-[-0.02em]">{lead.full_name}</h2>
      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <LeadStatusTag status={lead.status} />
        <span className="text-sm tabular-nums">{formatUzPhone(lead.phone)}</span>
        {waiting !== null && <span className={`text-[13px] font-semibold ${late ? 'text-coral-ink' : 'text-ink-2'}`}>{waiting} daq kutmoqda</span>}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <a href={`tel:${lead.phone}`} className="am-btn flex h-13 items-center justify-center gap-2.5 rounded-control bg-navy text-base font-medium text-white">
          <Icon name="phone" size={20} />
          Qo‘ng‘iroq qilish
        </a>
        <a
          href={`https://t.me/${lead.phone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="am-btn-o flex h-13 items-center justify-center gap-2.5 rounded-control border border-line-strong bg-white text-base font-medium"
        >
          <Icon name="telegram" size={20} strokeWidth={1.5} />
          Telegram’da yozish
          <span className="sr-only">(yangi oynada)</span>
        </a>
      </div>

      <section aria-labelledby="c-title" className="mt-5 rounded-card border border-line bg-sand p-4">
        <h3 id="c-title" className="m-0 text-xs font-medium text-ink-2">
          Shikoyat
        </h3>
        <p className="mt-1.5 mb-0 text-base leading-[1.55] whitespace-pre-line">{lead.message?.trim() || 'Shikoyat yozilmagan'}</p>
        <div className="mt-2.5 text-xs text-ink-2">Sayt formasi · {relativeDayTime(lead.created_at, now)}</div>
      </section>

      <MobileLeadForm key={lead.id} lead={lead} />

      <section aria-labelledby="h-title" className="mt-6">
        <h3 id="h-title" className="m-0 mb-2 text-base font-semibold">
          Tarix
        </h3>
        <LeadHistory events={lead.events} variant="table" />
      </section>
    </div>
  )
}
