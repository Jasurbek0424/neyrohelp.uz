'use client'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/shared/api/client'

import type { DoctorAdmin, DoctorInput, DoctorListItem, Specialty } from '../model/types'

export const doctorKeys = {
  all: ['admin', 'doctors'] as const,
  lists: () => [...doctorKeys.all, 'list'] as const,
  details: () => [...doctorKeys.all, 'detail'] as const,
  detail: (id: number) => [...doctorKeys.details(), id] as const,
}

export const specialtyKeys = {
  all: ['admin', 'specialties'] as const,
}

export const doctorListQuery = () =>
  queryOptions({ queryKey: doctorKeys.lists(), queryFn: ({ signal }) => api<DoctorListItem[]>('/admin/doctors', { signal }) })

export const doctorDetailQuery = (id: number) =>
  queryOptions({ queryKey: doctorKeys.detail(id), queryFn: ({ signal }) => api<DoctorAdmin>(`/admin/doctors/${id}`, { signal }) })

export const specialtiesQuery = () =>
  queryOptions({ queryKey: specialtyKeys.all, queryFn: ({ signal }) => api<Specialty[]>('/admin/specialties', { signal }), staleTime: 5 * 60_000 })

/** Yangi (id yo‘q) → POST, mavjud → PATCH. Saqlangach detal keshi javob bilan yangilanadi, ro‘yxat invalidate. */
export function useSaveDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Partial<DoctorInput> }) =>
      id ? api<DoctorAdmin>(`/admin/doctors/${id}`, { method: 'PATCH', body }) : api<DoctorAdmin>('/admin/doctors', { method: 'POST', body }),
    onSuccess: (data) => {
      qc.setQueryData(doctorKeys.detail(data.id), data)
      void qc.invalidateQueries({ queryKey: doctorKeys.lists() })
    },
  })
}

export function useDeleteDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/admin/doctors/${id}`, { method: 'DELETE' }),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: doctorKeys.detail(id) })
      void qc.invalidateQueries({ queryKey: doctorKeys.lists() })
    },
  })
}
