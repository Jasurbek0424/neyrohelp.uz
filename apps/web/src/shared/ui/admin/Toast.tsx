'use client'

import { useSyncExternalStore } from 'react'

import { registerStoreReset } from '@/shared/lib/admin/store-registry'

import { CloseIcon } from './icons'

type Toast = { id: number; tone: 'success' | 'error' | 'info'; text: string }

let items: Toast[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function push(tone: Toast['tone'], text: string, ms = tone === 'error' ? 7000 : 4000) {
  const id = ++seq
  items = [...items.slice(-3), { id, tone, text }]
  emit()
  setTimeout(() => dismiss(id), ms)
}
function dismiss(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

export const toast = {
  success: (t: string) => push('success', t),
  error: (t: string) => push('error', t),
  info: (t: string) => push('info', t),
}

registerStoreReset(() => {
  items = []
  emit()
})

const EMPTY: Toast[] = []

/** aria-live hududi: xatolar assertive, qolganlari polite */
export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => items,
    () => EMPTY,
  )
  const polite = list.filter((t) => t.tone !== 'error')
  const assertive = list.filter((t) => t.tone === 'error')
  const render = (t: Toast) => (
    <div key={t.id} className="pointer-events-auto flex min-h-11 w-[min(380px,calc(100vw-32px))] items-start gap-3 rounded-control bg-ink px-4 py-3 text-sm text-white shadow-[var(--am-shadow)]">
      <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${t.tone === 'error' ? 'bg-coral' : t.tone === 'success' ? 'bg-[#4FB37E]' : 'bg-mist'}`} />
      <span className="flex-1 leading-snug">{t.text}</span>
      <button type="button" aria-label="Xabarni yopish" onClick={() => dismiss(t.id)} className="-mr-1 flex size-6 cursor-pointer items-center justify-center rounded-[4px] text-mist hover:text-white">
        <CloseIcon size={12} />
      </button>
    </div>
  )
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2 max-md:bottom-20">
      <div role="status" aria-live="polite" className="flex flex-col items-end gap-2">
        {polite.map(render)}
      </div>
      <div role="alert" aria-live="assertive" className="flex flex-col items-end gap-2">
        {assertive.map(render)}
      </div>
    </div>
  )
}
