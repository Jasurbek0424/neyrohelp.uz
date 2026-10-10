'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

import { adminPaths, clearClientState, logoutRequest, postAuthMessage } from '@/entities/session'

/**
 * Chiqish: backend cookie'larni o‘chiradi va refresh oilasini bekor qiladi;
 * client — kesh + Zustand tozalanadi, boshqa tablar BroadcastChannel orqali xabardor qilinadi.
 */
export function useLogout() {
  const qc = useQueryClient()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const logout = useCallback(async () => {
    setPending(true)
    try {
      await logoutRequest()
    } catch {
      /* tarmoq xatosi bo‘lsa ham lokal holat tozalanadi */
    }
    clearClientState(qc)
    postAuthMessage({ type: 'logout' })
    router.replace(adminPaths.login)
  }, [qc, router])
  return { logout, pending }
}
