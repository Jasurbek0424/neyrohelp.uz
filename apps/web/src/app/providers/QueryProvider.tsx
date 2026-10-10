'use client'

import { QueryClient, QueryClientProvider, type QueryClientConfig } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import { ApiError } from '@/shared/api/client'

/**
 * Server state siyosati (admin):
 * - staleTime 30s: ro‘yxatlar orasida yurganda keraksiz so‘rov yo‘q
 * - gcTime 5 daq: ishlatilmagan kesh xotiradan tozalanadi
 * - 4xx xatolarda qayta urinmaydi (faqat tarmoq/5xx)
 */
export function makeQueryClient(extra: Pick<QueryClientConfig, 'queryCache' | 'mutationCache'> = {}) {
  return new QueryClient({
    ...extra,
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
      },
      mutations: { retry: false },
    },
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => makeQueryClient())
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
