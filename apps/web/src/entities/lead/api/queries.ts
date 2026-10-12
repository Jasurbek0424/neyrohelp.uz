import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { pollWhenOffline } from '../model/live'
import type { LeadFilters } from '../model/types'

import { dashboardKeys, leadKeys } from './keys'
import { fetchDashboard, fetchLead, fetchLeads } from './requests'

export const LEADS_PAGE_SIZE = 20

/**
 * Ro‘yxat SSE signali bilan yangilanadi (widgets/admin-shell → useLeadEvents); oqim uzilganda —
 * 30s polling, faqat tab ko‘rinib turganda. Sahifalashda oldingi ma’lumot ko‘rinib turadi.
 */
export const leadListQuery = (filters: LeadFilters) =>
  queryOptions({
    queryKey: leadKeys.list(filters),
    queryFn: ({ signal }) => fetchLeads(filters, signal),
    placeholderData: keepPreviousData,
    refetchInterval: pollWhenOffline(30_000),
    refetchIntervalInBackground: false,
  })

export const leadDetailQuery = (id: number) =>
  queryOptions({
    queryKey: leadKeys.detail(id),
    queryFn: ({ signal }) => fetchLead(id, signal),
    staleTime: 10_000,
  })

/** Sidebar badge / qo‘ng‘iroqcha: faqat counts kerak (limit=1) */
export const leadCountsQuery = () =>
  queryOptions({
    queryKey: leadKeys.counts(),
    queryFn: ({ signal }) => fetchLeads({ limit: 1 }, signal),
    select: (d) => d.counts,
    refetchInterval: pollWhenOffline(30_000),
    refetchIntervalInBackground: false,
  })

export const dashboardQuery = () =>
  queryOptions({
    queryKey: dashboardKeys.all,
    queryFn: ({ signal }) => fetchDashboard(signal),
    refetchInterval: pollWhenOffline(60_000),
    refetchIntervalInBackground: false,
  })
