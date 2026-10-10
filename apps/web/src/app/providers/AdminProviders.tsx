'use client'

import { MutationCache, QueryCache, QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useEffect, useState, type ReactNode } from 'react'

import { sessionKeys, useAdminUi, type Me } from '@/entities/session'
import { ApiError } from '@/shared/api/client'
import { Toaster } from '@/shared/ui/admin/Toast'

import { makeQueryClient } from './QueryProvider'

/** Devtools faqat development'da: production build'da shart statik — import bundle'ga tushmaydi */
const Devtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(() => import('@tanstack/react-query-devtools').then((m) => m.ReactQueryDevtools), { ssr: false })
    : () => null

/**
 * Backend admin/editor 2FA yoqmagan bo‘lsa har kontent endpointida 403 `totp_required` qaytaradi.
 * Bitta joyda ushlaymiz: `me.totp_required = true` → AdminShell profilga (2FA sozlash) yo‘naltiradi.
 */
function onApiError(client: () => QueryClient) {
  return (err: unknown) => {
    if (err instanceof ApiError && err.status === 403 && err.detail === 'totp_required') {
      client().setQueryData<Me>(sessionKeys.me(), (m) => (m ? { ...m, totp_required: true } : m))
    }
  }
}

function createAdminClient() {
  let ref: QueryClient | null = null
  const get = () => ref!
  ref = makeQueryClient({
    queryCache: new QueryCache({ onError: onApiError(get) }),
    mutationCache: new MutationCache({ onError: onApiError(get) }),
  })
  return ref
}

/** Admin SPA provayderlari: TanStack Query (alohida client), toastlar (aria-live), UI afzalliklari rehydrate */
export function AdminProviders({ children, nonce }: { children: ReactNode; nonce?: string }) {
  const [client] = useState(createAdminClient)
  useEffect(() => {
    // persist skipHydration: SSR markup bilan to‘qnashmasligi uchun faqat client'da
    void useAdminUi.persist.rehydrate()
  }, [])
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
      <Devtools initialIsOpen={false} buttonPosition="bottom-left" styleNonce={nonce} />
    </QueryClientProvider>
  )
}
