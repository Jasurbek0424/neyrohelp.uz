'use client'

import { useEffect, useState } from 'react'

/** «18 daq oldin» kabi nisbiy vaqtlar uchun — har `interval` ms da qayta render */
export function useNow(interval = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(t)
  }, [interval])
  return now
}
