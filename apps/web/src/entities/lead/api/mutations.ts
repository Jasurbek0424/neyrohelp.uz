'use client'

import { useMutation, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'

import type { Dashboard, LeadCounts, LeadDetail, LeadPage, LeadPatch, LeadRow, LeadStatus } from '../model/types'

import { dashboardKeys, leadKeys } from './keys'
import { patchLead, takeLead } from './requests'

type Snapshot = [QueryKey, unknown][]
type Optimistic = Partial<Pick<LeadDetail, 'status' | 'taken_by' | 'taken_at' | 'admin_note'>>

/** Rollback uchun: arizalar (ro‘yxatlar, detal, counts) va dashboard keshlari */
function snapshot(qc: QueryClient): Snapshot {
  return [...qc.getQueriesData({ queryKey: leadKeys.all }), ...qc.getQueriesData({ queryKey: dashboardKeys.all })]
}

function restore(qc: QueryClient, snap: Snapshot | undefined) {
  snap?.forEach(([key, data]) => qc.setQueryData(key, data))
}

function shiftCounts(counts: LeadCounts, from: LeadStatus, to: LeadStatus): LeadCounts {
  if (from === to) return counts
  return { ...counts, [from]: Math.max(0, counts[from] - 1), [to]: counts[to] + 1 }
}

/** PATCH tanasi → kesh uchun optimistic qism. Backend: status `new` ga qaytsa taken_* tozalanadi. */
function optimisticFromPatch(patch: LeadPatch): Optimistic {
  const out: Optimistic = {}
  if (patch.status) {
    out.status = patch.status
    if (patch.status === 'new') {
      out.taken_by = null
      out.taken_at = null
    }
  }
  if (patch.admin_note !== undefined) out.admin_note = patch.admin_note
  return out
}

/** Ro‘yxatlar, detal, counts va dashboard keshlarida bitta arizani yangilash */
function applyOptimistic(qc: QueryClient, id: number, patch: Optimistic) {
  let from: LeadStatus | undefined
  // LeadRow'da admin_note yo‘q — ro‘yxat qatorlariga faqat status/taken_*
  const rowPatch: Partial<LeadRow> = {}
  if (patch.status) rowPatch.status = patch.status
  if (patch.taken_by !== undefined) rowPatch.taken_by = patch.taken_by
  if (patch.taken_at !== undefined) rowPatch.taken_at = patch.taken_at
  qc.setQueriesData<LeadPage>({ queryKey: leadKeys.lists() }, (old) => {
    if (!old) return old
    const row = old.items.find((r) => r.id === id)
    if (!row) return old
    from ??= row.status
    return {
      ...old,
      counts: patch.status ? shiftCounts(old.counts, row.status, patch.status) : old.counts,
      items: old.items.map((r) => (r.id === id ? { ...r, ...rowPatch } : r)),
    }
  })
  const detail = qc.getQueryData<LeadDetail>(leadKeys.detail(id))
  from ??= detail?.status
  if (detail) qc.setQueryData<LeadDetail>(leadKeys.detail(id), { ...detail, ...patch })
  const to = patch.status
  if (to && from) {
    const f = from
    // counts query'si LeadPage saqlaydi (select bilan counts'ni oladi)
    qc.setQueryData<LeadPage>(leadKeys.counts(), (p) => (p ? { ...p, counts: shiftCounts(p.counts, f, to) } : p))
  }
  if (to && to !== 'new') {
    qc.setQueryData<Dashboard>(dashboardKeys.all, (d) => {
      if (!d || !d.waiting_list.some((r) => r.id === id)) return d
      return { ...d, waiting_list: d.waiting_list.filter((r) => r.id !== id), waiting: { ...d.waiting, count: Math.max(0, d.waiting.count - 1) } }
    })
  }
}

/** Mutatsiyadan keyin: shu ariza detali + barcha ro‘yxatlar + counts + dashboard */
function invalidateLead(qc: QueryClient, id: number) {
  void qc.invalidateQueries({ queryKey: leadKeys.lists() })
  void qc.invalidateQueries({ queryKey: leadKeys.detail(id) })
  void qc.invalidateQueries({ queryKey: leadKeys.counts() })
  void qc.invalidateQueries({ queryKey: dashboardKeys.all })
}

async function cancelLeadQueries(qc: QueryClient) {
  await Promise.all([qc.cancelQueries({ queryKey: leadKeys.all }), qc.cancelQueries({ queryKey: dashboardKeys.all })])
}

/** «Olish»: new → in_progress, taken_by = joriy xodim. Javob — LeadDetail. Optimistic + rollback. */
export function useTakeLead(actorName?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: [...leadKeys.all, 'take'],
    mutationFn: (id: number) => takeLead(id),
    onMutate: async (id) => {
      await cancelLeadQueries(qc)
      const snap = snapshot(qc)
      applyOptimistic(qc, id, { status: 'in_progress', taken_by: actorName ?? null, taken_at: new Date().toISOString() })
      return { snap }
    },
    onError: (_e, _id, ctx) => restore(qc, ctx?.snap),
    onSuccess: (data, id) => qc.setQueryData(leadKeys.detail(id), data),
    onSettled: (_d, _e, id) => invalidateLead(qc, id),
  })
}

/** Status va/yoki izoh. Optimistic + rollback, oxirida invalidate. */
export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: [...leadKeys.all, 'update'],
    mutationFn: ({ id, patch }: { id: number; patch: LeadPatch }) => patchLead(id, patch),
    onMutate: async ({ id, patch }) => {
      await cancelLeadQueries(qc)
      const snap = snapshot(qc)
      applyOptimistic(qc, id, optimisticFromPatch(patch))
      return { snap }
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
    onSuccess: (data, { id }) => qc.setQueryData(leadKeys.detail(id), data),
    onSettled: (_d, _e, { id }) => invalidateLead(qc, id),
  })
}

/** Qulaylik uchun: faqat status */
export function useUpdateLeadStatus() {
  const m = useUpdateLead()
  return {
    ...m,
    mutate: (id: number, status: LeadStatus, opts?: Parameters<typeof m.mutate>[1]) => m.mutate({ id, patch: { status } }, opts),
    mutateAsync: (id: number, status: LeadStatus) => m.mutateAsync({ id, patch: { status } }),
  }
}
