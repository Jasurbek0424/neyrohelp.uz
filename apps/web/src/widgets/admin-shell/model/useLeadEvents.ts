'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { dashboardKeys, leadKeys, setLeadLive } from '@/entities/lead'
import { meQueryOptions } from '@/entities/session'
import { API_BASE } from '@/shared/config/env'

/**
 * Arizalar jonli signali (SSE, GET /admin/leads/events): ariza yaratilsa/o‘zgarsa kesh yangilanadi.
 * - ulanish bor paytda polling o‘chadi (entities/lead → pollWhenOffline)
 * - server oqimni access token tugaganda yopadi → brauzer qayta ulanadi → 401 bo‘lsa oqim to‘xtaydi;
 *   shunda sessiyani yangilab (me → refresh), kechikish bilan qayta ulanamiz
 */
export function useLeadEvents(enabled: boolean) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') return
    let source: EventSource | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let failures = 0
    let stopped = false

    const refresh = () => {
      void qc.invalidateQueries({ queryKey: leadKeys.all })
      void qc.invalidateQueries({ queryKey: dashboardKeys.all })
    }

    const connect = () => {
      const es = new EventSource(`${API_BASE}/admin/leads/events`)
      source = es
      es.onopen = () => {
        failures = 0
        setLeadLive(true)
        refresh() // uzilish paytida o‘tkazib yuborilgan o‘zgarishlar
      }
      es.addEventListener('lead', refresh)
      es.onerror = () => {
        setLeadLive(false)
        if (es.readyState !== EventSource.CLOSED) return // brauzer o‘zi qayta ulanadi
        es.close()
        refresh() // zaxira polling'ni qayta yoqadi
        failures += 1
        timer = setTimeout(
          async () => {
            await qc.fetchQuery({ ...meQueryOptions(), staleTime: 0 }).catch(() => undefined)
            if (!stopped) connect()
          },
          Math.min(60_000, 5_000 * 2 ** (failures - 1)),
        )
      }
    }

    connect()
    return () => {
      stopped = true
      clearTimeout(timer)
      source?.close()
      setLeadLive(false)
    }
  }, [enabled, qc])
}
