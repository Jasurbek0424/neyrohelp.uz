'use client'

import { forwardRef, type ComponentProps } from 'react'

import { SearchIcon } from './icons'

/** Ikonka + input; ko‘rinadigan label o‘rniga aria-label majburiy */
export const SearchField = forwardRef<HTMLInputElement, ComponentProps<'input'> & { label: string; wrapperClassName?: string; tone?: 'white' | 'sand' }>(
  function SearchField({ label, wrapperClassName = '', tone = 'white', className = '', ...p }, ref) {
    return (
      <label
        className={`am-wrap flex h-10 items-center gap-2.5 rounded-control border px-3 text-ink-2 ${tone === 'sand' ? 'border-line bg-(--am-bg)' : 'border-line-strong bg-white'} ${wrapperClassName}`}
      >
        <SearchIcon />
        <input ref={ref} type="search" aria-label={label} className={`min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-2 ${className}`} {...p} />
      </label>
    )
  },
)
