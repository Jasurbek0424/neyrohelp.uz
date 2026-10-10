'use client'

import { useEffect, useRef } from 'react'

/** Global klaviatura yorlig‘i, masalan ⌘K / Ctrl+K */
export function useHotkey(key: string, handler: (e: KeyboardEvent) => void, { meta = false } = {}) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key.toLowerCase()) return
      if (meta && !(e.metaKey || e.ctrlKey)) return
      ref.current(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key, meta])
}
