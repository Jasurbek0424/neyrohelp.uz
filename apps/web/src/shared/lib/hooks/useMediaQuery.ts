'use client'

import { useCallback, useSyncExternalStore } from 'react'

/** SSR'da `fallback` (default false); brauzerda matchMedia bilan sinxron */
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => fallback,
  )
}

export const MOBILE_QUERY = '(max-width: 767.98px)'
export const useIsMobile = () => useMediaQuery(MOBILE_QUERY)
