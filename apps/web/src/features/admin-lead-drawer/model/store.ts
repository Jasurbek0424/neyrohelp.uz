'use client'

import { create } from 'zustand'

import { registerStoreReset } from '@/shared/lib/admin/store-registry'

/** Arizalar drawer'i: qaysi qator tanlangan va panel ochiqmi (faqat UI holati) */
type DrawerState = {
  selectedId: number | null
  open: boolean
  /** ↑/↓ bilan tanlash (panel ochiq bo‘lsa, u ham shu arizaga o‘tadi) */
  select: (id: number | null) => void
  openLead: (id: number) => void
  close: () => void
  reset: () => void
}

const initial = { selectedId: null, open: false }

export const useLeadDrawer = create<DrawerState>()((set) => ({
  ...initial,
  select: (selectedId) => set({ selectedId }),
  openLead: (id) => set({ selectedId: id, open: true }),
  close: () => set({ open: false }),
  reset: () => set(initial),
}))

registerStoreReset(() => useLeadDrawer.getState().reset())
