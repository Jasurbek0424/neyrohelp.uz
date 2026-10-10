'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { registerStoreReset } from '@/shared/lib/admin/store-registry'
import type { ContentLocale } from '@/shared/lib/admin/ltext'

/**
 * Admin UI afzalliklari (server ma’lumoti EMAS — `me` TanStack Query'da).
 * localStorage'da faqat shu ikki maydon: maxfiy hech narsa yo‘q.
 */
type UiState = {
  sidebarCollapsed: boolean
  contentLocale: ContentLocale
  toggleSidebar: () => void
  setContentLocale: (l: ContentLocale) => void
  reset: () => void
}

const initial = { sidebarCollapsed: false, contentLocale: 'uz' as ContentLocale }

export const useAdminUi = create<UiState>()(
  persist(
    (set) => ({
      ...initial,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setContentLocale: (contentLocale) => set({ contentLocale }),
      reset: () => set(initial),
    }),
    {
      name: 'nm-admin-ui',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, contentLocale: s.contentLocale }),
      // v1: { collapsed: boolean, lang: string } → v2
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Record<string, unknown>
        if (version < 2) {
          const lang = p.lang
          return {
            sidebarCollapsed: Boolean(p.collapsed),
            contentLocale: lang === 'ru' || lang === 'en' ? lang : 'uz',
          }
        }
        return p as Pick<UiState, 'sidebarCollapsed' | 'contentLocale'>
      },
      // SSR bilan mos kelishi uchun: client'da AdminProviders effektida rehydrate() chaqiriladi
      skipHydration: true,
    },
  ),
)

registerStoreReset(() => useAdminUi.getState().reset())
