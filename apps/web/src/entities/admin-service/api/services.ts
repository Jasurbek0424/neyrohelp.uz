'use client'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/shared/api/client'

import type { BulkItem, Service, ServiceCategory, ServiceInput, ServicePatch } from '../model/types'

export const serviceKeys = {
  all: ['admin', 'services'] as const,
  list: () => [...serviceKeys.all, 'list'] as const,
}

export const servicesQuery = () =>
  queryOptions({ queryKey: serviceKeys.list(), queryFn: ({ signal }) => api<ServiceCategory[]>('/admin/services', { signal }) })

/** Narxlar: optimistic EMAS — server javobi keshga yoziladi, keyin invalidate */
export function useBulkUpdateServices() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: BulkItem[]) => api<ServiceCategory[]>('/admin/services/bulk', { method: 'PATCH', body: { items } }),
    onSuccess: (data) => {
      qc.setQueryData(serviceKeys.list(), data)
      void qc.invalidateQueries({ queryKey: serviceKeys.all })
    },
  })
}

export function useSaveService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: ServicePatch | ServiceInput }) =>
      id ? api<Service>(`/admin/services/${id}`, { method: 'PATCH', body }) : api<Service>('/admin/services', { method: 'POST', body: body as ServiceInput }),
    onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }),
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/admin/services/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }),
  })
}

/**
 * Yo‘nalish ichida tartib: o‘zgargan xizmatlarga PATCH {order}. Optimistic — ro‘yxat darhol qayta tartiblanadi,
 * xato bo‘lsa oldingi holatga qaytadi; oxirida invalidate.
 */
export function useReorderServices() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (items: { id: number; order: number }[]) => {
      for (const it of items) await api<Service>(`/admin/services/${it.id}`, { method: 'PATCH', body: { order: it.order } })
    },
    onMutate: async (items) => {
      await qc.cancelQueries({ queryKey: serviceKeys.list() })
      const prev = qc.getQueryData<ServiceCategory[]>(serviceKeys.list())
      const map = new Map(items.map((i) => [i.id, i.order]))
      qc.setQueryData<ServiceCategory[]>(serviceKeys.list(), (old) =>
        old?.map((c) => ({ ...c, services: c.services.map((s) => (map.has(s.id) ? { ...s, order: map.get(s.id)! } : s)).sort((a, b) => a.order - b.order) })),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(serviceKeys.list(), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: serviceKeys.all }),
  })
}
