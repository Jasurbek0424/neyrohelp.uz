'use client'

import { useState } from 'react'

import type { Service } from '@/entities/admin-service'
import { groupDigits, parseDigits } from '@/shared/lib/admin/format'
import { ltOr } from '@/shared/lib/admin/ltext'
import { CheckIcon } from '@/shared/ui/admin/icons'

import { usePriceDrafts } from '../model/store'

export function useRowDirty(id: number) {
  return usePriceDrafts((s) => Boolean(s.drafts[id]))
}

/** Davomiylik (daq) — inline tahrir */
export function DurationCell({ service }: { service: Service }) {
  const draft = usePriceDrafts((s) => s.drafts[service.id])
  const setField = usePriceDrafts((s) => s.setField)
  const value = draft && 'duration_minutes' in draft ? draft.duration_minutes : service.duration_minutes
  const name = ltOr(service.title)
  return (
    <div className="flex items-center gap-2 text-[13px] text-ink-2">
      <input
        type="text"
        inputMode="numeric"
        aria-label={`${name}: davomiyligi, daqiqa`}
        className="am-in h-9 w-[72px] rounded-control border border-line-strong bg-white px-2.5 text-right text-sm text-ink tabular-nums"
        value={value ?? ''}
        onChange={(e) => {
          const n = parseDigits(e.target.value, 4)
          setField(service, 'duration_minutes', n === null ? null : Math.min(n, 1440))
        }}
      />
      daq
    </div>
  )
}

/** Narx (so‘m) — bo‘sh = «Administrator aytadi» */
export function PriceCell({ service }: { service: Service }) {
  const draft = usePriceDrafts((s) => s.drafts[service.id])
  const setField = usePriceDrafts((s) => s.setField)
  const value = draft && 'price' in draft ? draft.price : service.price
  const [focus, setFocus] = useState(false)
  const name = ltOr(service.title)
  return (
    <div className={`am-wrap flex h-9 w-[170px] items-center rounded-control border bg-white ${focus ? 'border-navy' : 'border-line-strong'}`}>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`${name}: narxi, so‘m`}
        placeholder="Narx yo‘q"
        className="h-[34px] min-w-0 flex-1 border-0 bg-transparent pr-2 pl-2.5 text-right text-sm text-ink tabular-nums outline-none placeholder:text-ink-2"
        value={groupDigits(value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onChange={(e) => setField(service, 'price', parseDigits(e.target.value, 10))}
      />
      <span className="pr-2.5 text-[13px] text-ink-2">so‘m</span>
    </div>
  )
}

/** «…dan» belgisi — role="checkbox" kvadrat */
export function FromCell({ service }: { service: Service }) {
  const draft = usePriceDrafts((s) => s.drafts[service.id])
  const setField = usePriceDrafts((s) => s.setField)
  const on = draft && 'price_from' in draft ? Boolean(draft.price_from) : service.price_from
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={`${ltOr(service.title)}: narx «dan» boshlanadi`}
      onClick={() => setField(service, 'price_from', !on)}
      className={`flex size-5 cursor-pointer items-center justify-center rounded-[4px] border p-0 text-white ${on ? 'border-navy bg-navy' : 'border-field bg-white'}`}
    >
      <span className={on ? 'opacity-100' : 'opacity-0'}>
        <CheckIcon size={12} strokeWidth={2.4} />
      </span>
    </button>
  )
}
