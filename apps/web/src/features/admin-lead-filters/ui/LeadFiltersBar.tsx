'use client'

import { useEffect, useState } from 'react'

import { useDebouncedValue } from '@/shared/lib/hooks/useDebouncedValue'
import { Select } from '@/shared/ui/admin/Field'
import { SearchField } from '@/shared/ui/admin/SearchField'

import { periodOptions, useLeadFilters, type Period } from '../model/useLeadFilters'

/** Qidiruv (debounce 300ms) + sana + «kim oldi» + tozalash */
export function LeadFiltersBar({ takers, meName }: { takers: string[]; meName?: string }) {
  const f = useLeadFilters()
  const [q, setQ] = useState(f.q)
  const debounced = useDebouncedValue(q, 300)

  useEffect(() => {
    if (debounced !== f.q) f.set({ q: debounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const people = [...new Set([...(meName ? [meName] : []), ...takers, ...(f.takenBy ? [f.takenBy] : [])])]

  return (
    <div className="flex h-10 shrink-0 items-center gap-2">
      <SearchField
        label="Ism yoki telefon bo‘yicha qidirish"
        placeholder="Ism yoki telefon"
        wrapperClassName="min-w-0 flex-[1_1_140px]"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Select aria-label="Sana" wrapperClassName="w-[148px] shrink-0" value={f.period} onChange={(e) => f.set({ period: e.target.value as Period })}>
        {periodOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select aria-label="Kim oldi" wrapperClassName="w-[176px] shrink-0" value={f.takenBy} onChange={(e) => f.set({ taken_by: e.target.value })}>
        <option value="">Kim oldi: Hammasi</option>
        {people.map((p) => (
          <option key={p} value={p}>
            Kim oldi: {p === meName ? `${p} (men)` : p}
          </option>
        ))}
      </Select>
      <button
        type="button"
        onClick={() => {
          setQ('')
          f.clear()
        }}
        className="am-link ml-auto h-10 shrink-0 cursor-pointer border-0 bg-transparent px-1 text-[13px] font-medium whitespace-nowrap text-ink"
      >
        Filtrlarni tozalash
      </button>
    </div>
  )
}
