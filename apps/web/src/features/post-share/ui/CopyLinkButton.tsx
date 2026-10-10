'use client'

import { useEffect, useRef, useState } from 'react'

import { LinkIcon } from '@/shared/ui/Icons'

export function CopyLinkButton({ label, copiedLabel, url }: { label: string; copiedLabel: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url || window.location.href)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-11 items-center gap-2 rounded-control border border-line-strong px-4 text-[15px] font-medium transition-colors hover:bg-sand"
      >
        <LinkIcon />
        {label}
      </button>
      <span role="status" aria-live="polite" className={copied ? 'text-sm text-ok' : 'sr-only'}>
        {copied ? copiedLabel : ''}
      </span>
    </>
  )
}
