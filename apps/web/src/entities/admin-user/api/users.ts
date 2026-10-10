'use client'

import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/shared/api/client'

import type { AdminUser, AuditPage, UserInput, UserPatch } from '../model/types'

export const userKeys = {
  all: ['admin', 'users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  audit: (f: AuditFilters) => ['admin', 'audit', f] as const,
}

export const usersQuery = () => queryOptions({ queryKey: userKeys.list(), queryFn: ({ signal }) => api<AdminUser[]>('/admin/users', { signal }) })

export type AuditGroup = 'auth' | 'leads' | 'content' | 'prices' | 'users'
export type AuditFilters = { page: number; user_id?: number; group?: AuditGroup; date_from?: string; date_to?: string }

export const auditQuery = (f: AuditFilters) =>
  queryOptions({
    queryKey: userKeys.audit(f),
    queryFn: ({ signal }) => api<AuditPage>('/admin/audit', { query: { ...f, limit: 50 }, signal }),
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

export function useSetUserPassword() {
  return useMutation({ mutationFn: ({ id, password }: { id: number; password: string }) => api<void>(`/admin/users/${id}/password`, { method: 'POST', body: { password } }) })
}

export function useRevokeSessions() {
  return useMutation({ mutationFn: (id: number) => api<void>(`/admin/users/${id}/revoke-sessions`, { method: 'POST' }) })
}
