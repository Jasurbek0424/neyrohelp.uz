'use client'

import { useRef, type ReactNode } from 'react'

type Tab<T extends string> = { value: T; label: ReactNode; badge?: ReactNode }

/**
 * Pastki chiziqli tablar. `role="tablist"` + ←/→ bilan o‘tish.
 * `asFilter` — status filtri sifatida (aria-pressed tugmalar guruhi, dizayn A3).
 */
export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  label,
  asFilter,
  className = '',
  height = 41,
  panelId,
}: {
  value: T
  onChange: (v: T) => void
  tabs: Tab<T>[]
  label: string
  asFilter?: boolean
  className?: string
  height?: number
  panelId?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    refs.current[next]?.focus()
    onChange(tabs[next]!.value)
  }
  return (
    <div
      role={asFilter ? 'group' : 'tablist'}
      aria-label={label}
      className={`am-hs flex shrink-0 items-stretch overflow-x-auto overflow-y-hidden border-b border-line ${asFilter ? 'gap-2' : 'gap-1'} ${className}`}
      style={{ height }}
    >
      {tabs.map((t, i) => {
        const on = t.value === value
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role={asFilter ? undefined : 'tab'}
            aria-selected={asFilter ? undefined : on}
            aria-controls={asFilter ? undefined : panelId}
            aria-pressed={asFilter ? on : undefined}
            tabIndex={asFilter || on ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            style={{ height }}
            className={`-mb-px flex shrink-0 cursor-pointer items-center gap-1.5 border-0 border-b-2 bg-transparent text-sm whitespace-nowrap hover:text-ink ${asFilter ? 'px-2' : 'px-4'} ${
              on ? `border-navy font-semibold ${asFilter ? 'text-ink' : 'text-navy'}` : 'border-transparent font-medium text-ink-2'
            }`}
          >
            {t.label}
            {t.badge}
          </button>
        )
      })}
    </div>
  )
}
