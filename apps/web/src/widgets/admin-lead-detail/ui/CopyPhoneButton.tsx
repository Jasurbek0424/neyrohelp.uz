'use client'

import { useEffect, useState } from 'react'

import { toast } from '@/shared/ui/admin/Toast'

export function CopyPhoneButton({ phone, className = '' }: { phone: string; className?: string }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 2000)
    return () => clearTimeout(t)
  }, [done])
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(phone)
          setDone(true)
        } catch {
          toast.error('Nusxalab bo‘lmadi')
        }
      }}
      className={`am-btn-o h-10 cursor-pointer rounded-control border border-line-strong bg-white px-4 text-sm font-medium text-ink ${className}`}
    >
      <span aria-live="polite">{done ? 'Nusxalandi' : 'Nusxalash'}</span>
    </button>
  )
}
