'use client'

import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/shared/api/client'

import type { AdminUser, AuditPage, UserInput, UserPatch } from '../model/types'

export const userKeys = {
  all: ['admin', 'users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  audit: (page: number) => ['admin', 'audit', page] as const,
}

export const usersQuery = () => queryOptions({ queryKey: userKeys.list(), queryFn: ({ signal }) => api<AdminUser[]>('/admin/users', { signal }) })

export const auditQuery = (page: number) =>
  queryOptions({
    queryKey: userKeys.audit(page),
    queryFn: ({ signal }) => api<AuditPage>('/admin/audit', { query: { page }, signal }),
    placeholderData: keepPreviousData,
  })

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UserInput) => api<AdminUser>('/admin/users', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.list() }),
  })
}

/** Rol/faollik: optimistic (ro‘yxat kichik), xato bo‘lsa rollback */
export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: UserPatch }) => api<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: patch }),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: userKeys.list() })
      const prev = qc.getQueryData<AdminUser[]>(userKeys.list())
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== null && v !== undefined)) as Partial<AdminUser>
      qc.setQueryData<AdminUser[]>(userKeys.list(), (old) => old?.map((u) => (u.id === id ? { ...u, ...clean } : u)))
      return { prev }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(userKeys.list(), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: userKeys.list() }),
  })
}

export function useRevokeSessions() {
  return useMutation({ mutationFn: (id: number) => api<void>(`/admin/users/${id}/revoke-sessions`, { method: 'POST' }) })
}
