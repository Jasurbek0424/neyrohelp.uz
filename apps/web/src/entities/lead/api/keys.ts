import type { LeadFilters } from '../model/types'

/**
 * Query key factory. Ierarxiya:
 * ['admin','leads'] ─┬─ 'list' ─ {filters}
 *                    ├─ 'detail' ─ id
 *                    └─ 'counts'
 * ['admin','dashboard']
 */
export const leadKeys = {
  all: ['admin', 'leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: LeadFilters) => [...leadKeys.lists(), filters] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: number) => [...leadKeys.details(), id] as const,
  counts: () => [...leadKeys.all, 'counts'] as const,
}

export const dashboardKeys = {
  all: ['admin', 'dashboard'] as const,
}
