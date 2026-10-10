'use client'

import { useMemo } from 'react'

import { isLeadStatus, LEADS_PAGE_SIZE, type LeadFilters, type LeadStatus } from '@/entities/lead'
import { addDays, isoDay } from '@/shared/lib/admin/time'
import { useUrlState } from '@/shared/lib/hooks/useUrlState'

export type Period = '' | 'today' | 'yesterday' | '7d' | '30d'

export const periodOptions: { value: Period; label: string }[] = [
  { value: '', label: 'Sana: Hammasi' },
  { value: 'today', label: 'Sana: Bugun' },
  { value: 'yesterday', label: 'Sana: Kecha' },
  { value: '7d', label: 'Sana: 7 kun' },
  { value: '30d', label: 'Sana: 30 kun' },
]

export function periodRange(period: Period): { date_from?: string; date_to?: string } {
  const today = isoDay()
  switch (period) {
    case 'today':
      return { date_from: today, date_to: today }
    case 'yesterday': {
      const y = addDays(today, -1)
      return { date_from: y, date_to: y }
    }
    case '7d':
      return { date_from: addDays(today, -6), date_to: today }
    case '30d':
      return { date_from: addDays(today, -29), date_to: today }
    default:
      return {}
  }
}

const KEYS = ['status', 'q', 'period', 'taken_by', 'page'] as const

/** Arizalar filtrlari URL'da: ?status=new&q=…&period=7d&taken_by=…&page=2 */
export function useLeadFilters() {
  const [values, setValues] = useUrlState(KEYS)
  const status: LeadStatus | undefined = isLeadStatus(values.status) ? values.status : undefined
  const period = (['today', 'yesterday', '7d', '30d'].includes(values.period) ? values.period : '') as Period
  const page = Math.max(1, Number(values.page) || 1)

  const apiFilters: LeadFilters = useMemo(
    () => ({
      status,
      q: values.q.trim() || undefined,
      taken_by: values.taken_by || undefined,
      ...periodRange(period),
      page,
      limit: LEADS_PAGE_SIZE,
    }),
    [status, values.q, values.taken_by, period, page],
  )

  return {
    status,
    q: values.q,
    period,
    takenBy: values.taken_by,
    page,
    apiFilters,
    /** filtr o‘zgarsa sahifa 1 ga qaytadi */
    set: (patch: Partial<{ status: LeadStatus | ''; q: string; period: Period; taken_by: string }>) => setValues({ ...patch, page: null }),
    setPage: (p: number) => setValues({ page: p === 1 ? null : p }),
    clear: () => setValues({ status: null, q: null, period: null, taken_by: null, page: null }),
    hasFilters: Boolean(values.q || values.period || values.taken_by),
  }
}
