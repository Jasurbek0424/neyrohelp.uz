import type { QueryClient } from '@tanstack/react-query'

import { resetAllStores } from '@/shared/lib/admin/store-registry'

/**
 * Lokal holatni to‘liq tozalash (logout, sessiya tugashi, boshqa tabdan signal):
 * 1) davom etayotgan so‘rovlarni bekor qilish  2) butun TanStack keshini o‘chirish  3) barcha Zustand store'larni reset
 */
export function clearClientState(queryClient: QueryClient) {
  void queryClient.cancelQueries()
  queryClient.clear()
  resetAllStores()
}
