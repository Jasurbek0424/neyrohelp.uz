'use client'

import { leadStatusMeta, leadStatusTabs, type LeadCounts, type LeadStatus } from '@/entities/lead'
import { CountBadge } from '@/shared/ui/admin/StatusTag'
import { Tabs } from '@/shared/ui/admin/Tabs'

import { useLeadFilters } from '../model/useLeadFilters'

type TabValue = 'all' | LeadStatus

/** Desktop: pastki chiziqli status tablari count'lar bilan (aria-pressed filtr) */
export function LeadStatusFilter({ counts }: { counts?: LeadCounts }) {
  const f = useLeadFilters()
  const tabs = [
    { value: 'all' as TabValue, label: 'Barchasi', badge: <CountBadge>{counts?.all ?? '–'}</CountBadge> },
    ...leadStatusTabs.map((s) => ({
      value: s as TabValue,
      label: leadStatusMeta[s].label,
      badge: <CountBadge tone={s === 'new' ? 'coral' : 'neutral'}>{counts?.[s] ?? '–'}</CountBadge>,
    })),
  ]
  return <Tabs asFilter label="Status bo‘yicha filtr" height={44} value={f.status ?? 'all'} onChange={(v) => f.set({ status: v === 'all' ? '' : v })} tabs={tabs} />
}

/** Mobil: gorizontal skroll chiplar (A7) */
export function LeadStatusChips({ counts }: { counts?: LeadCounts }) {
  const f = useLeadFilters()
  // «Barchasi» boshida — tanlangan chip 390px ekranda ham darhol ko‘rinadi
  const items: { value: TabValue; label: string; count?: number }[] = [
    { value: 'all', label: 'Barchasi', count: counts?.all },
    ...leadStatusTabs.filter((s) => s !== 'spam').map((s) => ({ value: s as TabValue, label: leadStatusMeta[s].label, count: counts?.[s] })),
  ]
  const current: TabValue = f.status ?? 'all'
  return (
    <div role="group" aria-label="Status bo‘yicha filtr" className="am-hs flex h-15 shrink-0 gap-2 overflow-x-auto overflow-y-hidden px-4 py-3">
      {items.map((c) => {
        const on = c.value === current
        return (
          <button
            key={c.value}
            type="button"
            aria-pressed={on}
            onClick={() => f.set({ status: c.value === 'all' ? '' : c.value })}
            className={`flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-control border px-3.5 text-sm whitespace-nowrap ${on ? 'border-navy bg-navy font-semibold text-white' : 'border-line-strong bg-white font-medium text-ink'}`}
          >
            {c.label}
            <span className="text-[13px] tabular-nums opacity-80">{c.count ?? ''}</span>
          </button>
        )
      })}
    </div>
  )
}
