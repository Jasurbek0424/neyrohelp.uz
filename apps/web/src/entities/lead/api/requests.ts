import { api, ApiError } from '@/shared/api/client'
import { API_BASE } from '@/shared/config/env'

import type { Dashboard, LeadDetail, LeadExportFilters, LeadFilters, LeadPage, LeadPatch } from '../model/types'

export const fetchLeads = (filters: LeadFilters, signal?: AbortSignal) =>
  api<LeadPage>('/admin/leads', { query: { ...filters }, signal })

export const fetchLead = (id: number, signal?: AbortSignal) => api<LeadDetail>(`/admin/leads/${id}`, { signal })

export const takeLead = (id: number) => api<LeadDetail>(`/admin/leads/${id}/take`, { method: 'POST' })

export const patchLead = (id: number, body: LeadPatch) => api<LeadDetail>(`/admin/leads/${id}`, { method: 'PATCH', body })

export const fetchDashboard = (signal?: AbortSignal) => api<Dashboard>('/admin/dashboard', { signal })

/**
 * Excel eksport: `window.location` emas — fetch + Blob (cookie bilan, xatoni ko‘rsatish mumkin).
 * 401 bo‘lsa bir marta refresh qilib qayta urinadi.
 */
export async function downloadLeadsExport(filters: LeadExportFilters): Promise<{ blob: Blob; filename: string }> {
  const url = new URL(`${API_BASE}/admin/leads/export`, window.location.origin)
  for (const [k, v] of Object.entries(filters)) if (v) url.searchParams.set(k, String(v))

  const get = () => fetch(url, { credentials: 'same-origin', headers: { accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } })
  let res = await get()
  if (res.status === 401) {
    const r = await fetch(`${API_BASE}/admin/auth/refresh`, { method: 'POST', credentials: 'same-origin' })
    if (r.ok) res = await get()
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, data?.detail ?? 'error')
  }
  const cd = res.headers.get('content-disposition') ?? ''
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)
  const filename = match?.[1] ? decodeURIComponent(match[1]) : `arizalar-${new Date().toISOString().slice(0, 10)}.xlsx`
  return { blob: await res.blob(), filename }
}
