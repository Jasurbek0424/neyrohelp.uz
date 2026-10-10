'use client'

import type { ReactNode } from 'react'

type Option<T extends string> = { value: T; label: ReactNode; ariaLabel?: string }

type Props<T extends string> = {
  value: T
  onChange: (v: T) => void
  options: Option<T>[]
  label: string
  /** dark — tanlangan navy fonda (filtrlar); light — navy-soft (til) */
  tone?: 'dark' | 'light'
  className?: string
  itemClassName?: string
}

/** Bir-biriga yopishgan tugmalar guruhi (aria-pressed) */
export function Segmented<T extends string>({ value, onChange, options, label, tone = 'dark', className = '', itemClassName = 'px-4' }: Props<T>) {
  return (
    <div role="group" aria-label={label} className={`flex h-10 overflow-hidden rounded-control border border-line-strong bg-white ${className}`}>
      {options.map((o) => {
        const on = o.value === value
        const active = tone === 'dark' ? 'bg-navy text-white font-semibold' : 'bg-navy-soft text-navy font-semibold'
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 border-0 border-r border-line text-sm whitespace-nowrap last:border-r-0 ${on ? active : 'bg-white font-medium text-ink hover:bg-sand'} ${itemClassName}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
