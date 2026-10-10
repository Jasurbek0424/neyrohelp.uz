'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

type Values = Record<string, string | number | null | undefined>

/**
 * Filtrlar va tablar URL search params'da (ulashsa / orqaga qaytsa saqlanadi).
 * `router.replace` — tarixni to‘ldirmaydi, scroll joyida qoladi.
 * keys/defaults har renderda yangi massiv/obyekt bo‘lishi mumkin — shuning uchun
 * memo'lar ularning barqaror string ko‘rinishiga bog‘langan.
 */
export function useUrlState<K extends string>(keys: readonly K[], defaults: Partial<Record<K, string>> = {}) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const keysKey = keys.join(',')
  const defaultsKey = JSON.stringify(defaults)

  const values = useMemo(() => {
    const d = JSON.parse(defaultsKey) as Record<string, string | undefined>
    const out = {} as Record<K, string>
    for (const k of keysKey.split(',') as K[]) out[k] = params.get(k) ?? d[k] ?? ''
    return out
  }, [params, keysKey, defaultsKey])

  const set = useCallback(
    (patch: Values) => {
      const d = JSON.parse(defaultsKey) as Record<string, string | undefined>
      const next = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === '' || String(v) === d[k]) next.delete(k)
        else next.set(k, String(v))
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router, defaultsKey],
  )

  return [values, set] as const
}
