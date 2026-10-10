'use client'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/shared/api/client'

import type { SettingsKey, SettingsValue } from '../model/types'

export const settingsKeys = {
  all: ['admin', 'settings'] as const,
  detail: (key: SettingsKey) => [...settingsKeys.all, key] as const,
}

export const settingsQuery = (key: SettingsKey) =>
  queryOptions({ queryKey: settingsKeys.detail(key), queryFn: ({ signal }) => api<SettingsValue>(`/admin/settings/${key}`, { signal }) })

export function useSaveSettings(key: SettingsKey) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (value: SettingsValue) => api<SettingsValue>(`/admin/settings/${key}`, { method: 'PUT', body: value }),
    onSuccess: (data) => {
      qc.setQueryData(settingsKeys.detail(key), data)
      void qc.invalidateQueries({ queryKey: settingsKeys.detail(key) })
    },
  })
}
