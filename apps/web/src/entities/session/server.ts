import 'server-only'

import { cookies } from 'next/headers'

import { API_BASE, API_INTERNAL_URL } from '@/shared/config/env'

import type { Me } from './model/types'

/** Server-only public API (index.ts client'ga mo‘ljallangan) */
export { sessionKeys } from './api/session'

/**
 * Panel layout'i uchun: access cookie tirik bo‘lsa `me` serverda olinadi va keshga solinadi —
 * panel karkasi va sarlavha birinchi HTML'da keladi (client'da me so‘rovini kutmaydi → LCP).
 * Cookie yo‘q/eskirgan yoki API javob bermasa — null: client avvalgidek o‘zi tekshiradi (refresh bilan).
 */
export async function fetchMeOnServer(): Promise<Me | null> {
  const access = (await cookies()).get('nm_access')?.value
  if (!access) return null
  try {
    const res = await fetch(`${API_INTERNAL_URL}${API_BASE}/admin/auth/me`, {
      headers: { accept: 'application/json', cookie: `nm_access=${access}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    })
    return res.ok ? ((await res.json()) as Me) : null
  } catch {
    return null
  }
}
