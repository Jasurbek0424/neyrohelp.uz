'use client'

import { useEffect } from 'react'

const MESSAGE = 'Saqlanmagan o‘zgarishlar bor. Sahifadan chiqsangiz, ular yo‘qoladi. Davom etasizmi?'

/**
 * Saqlanmagan o‘zgarishlar bo‘lsa:
 * - brauzer yopilishi/yangilanishida `beforeunload` ogohlantirishi
 * - ilova ichidagi <a> havolalarga bosilganda tasdiqlash (App Router'da navigatsiyani bloklash API'si yo‘q)
 */
export function useUnsavedChangesGuard(dirty: boolean, message = MESSAGE) {
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.skipGuard !== undefined) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin || url.protocol === 'tel:' || url.protocol === 'mailto:') return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      if (!window.confirm(message)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty, message])
}

export function confirmDiscard(dirty: boolean, message = MESSAGE): boolean {
  return !dirty || window.confirm(message)
}
