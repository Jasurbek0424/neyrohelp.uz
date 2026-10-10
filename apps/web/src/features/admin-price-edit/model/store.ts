'use client'

import { create } from 'zustand'

import type { Service } from '@/entities/admin-service'
import { registerStoreReset } from '@/shared/lib/admin/store-registry'

/** Saqlanmagan narx o‘zgarishlari: serviceId → o‘zgargan maydonlar (asl qiymatga qaytsa — o‘chadi) */
export type PriceDraft = { price?: number | null; duration_minutes?: number | null; price_from?: boolean }
type Field = keyof PriceDraft

type State = {
  drafts: Record<number, PriceDraft>
  setField: <K extends Field>(service: Service, field: K, value: PriceDraft[K]) => void
  discard: () => void
  reset: () => void
}

export const usePriceDrafts = create<State>()((set) => ({
  drafts: {},
  setField: (service, field, value) =>
    set((s) => {
      const current = { ...(s.drafts[service.id] ?? {}) }
      if (value === service[field]) delete current[field]
      else current[field] = value as never
      const drafts = { ...s.drafts }
      if (Object.keys(current).length) drafts[service.id] = current
      else delete drafts[service.id]
      return { drafts }
    }),
  discard: () => set({ drafts: {} }),
  reset: () => set({ drafts: {} }),
}))

registerStoreReset(() => usePriceDrafts.getState().reset())

export const selectDirtyCount = (s: State) => Object.keys(s.drafts).length
