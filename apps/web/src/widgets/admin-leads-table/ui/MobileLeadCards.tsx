'use client'

import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

import { TakeLeadButton } from '@/features/admin-lead-status'
import { isLate, leadDetailQuery, LeadStatusTag, type LeadRow } from '@/entities/lead'
import { adminPaths } from '@/entities/session'
import { ageShort } from '@/shared/lib/admin/time'
import { useNow } from '@/shared/lib/hooks/useNow'
import { formatUzPhone } from '@/shared/lib/phone'
import { Icon } from '@/shared/ui/admin/icons'

/** A7: mobil kartalar — ism, vaqt (15 daqiqadan oshsa qizil), telefon, shikoyat, status, «Olish»/«Ochish», qo‘ng‘iroq */
export function MobileLeadCards({ items }: { items: LeadRow[] }) {
  const qc = useQueryClient()
  const now = useNow(30_000)
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {items.map((r) => {
        const late = isLate(r, now)
        const prefetch = () => void qc.prefetchQuery(leadDetailQuery(r.id))
        return (
          <li key={r.id} className="rounded-card border border-line bg-white px-4 py-3.5">
            <Link href={adminPaths.lead(r.id)} aria-label={`Arizani ochish: ${r.full_name}`} className="block" onPointerEnter={prefetch} onTouchStart={prefetch}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-base font-semibold">{r.full_name}</span>
                <span className={`shrink-0 text-[13px] tabular-nums ${late ? 'font-semibold text-coral-ink' : 'text-ink-2'}`}>{ageShort(r.created_at, now)}</span>
              </span>
              <span className="mt-0.5 block text-sm tabular-nums">{formatUzPhone(r.phone)}</span>
              {r.message?.trim() && <span className="mt-1.5 line-clamp-2 block text-sm leading-[1.45] text-ink-2">{r.message}</span>}
            </Link>
            <div className="mt-3 flex items-center gap-2">
              <LeadStatusTag status={r.status} />
              {r.status === 'new' ? (
                <TakeLeadButton lead={r} size="lg" className="ml-auto" />
              ) : (
                <Link href={adminPaths.lead(r.id)} onPointerEnter={prefetch} className="am-btn ml-auto flex h-9 items-center rounded-control bg-navy px-[18px] text-sm font-medium text-white">
                  Ochish
                </Link>
              )}
              <a href={`tel:${r.phone}`} aria-label={`Qo‘ng‘iroq qilish: ${r.full_name}`} className="am-btn-o flex size-9 items-center justify-center rounded-control border border-line-strong bg-white">
                <Icon name="phone" size={18} />
              </a>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
