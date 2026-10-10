'use client'

import { ChevronIcon } from './icons'

function pagesToShow(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1]! > 1) out.push('…')
    out.push(p)
  })
  return out
}

const btn = 'am-btn-o flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-control border border-line bg-white px-2 text-[13px] font-medium text-ink disabled:cursor-not-allowed disabled:opacity-50'

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null
  return (
    <nav aria-label="Sahifalash" className="flex gap-1">
      <button type="button" aria-label="Oldingi sahifa" className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronIcon dir="left" size={14} />
      </button>
      {pagesToShow(page, pages).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="flex h-8 min-w-6 items-center justify-center text-[13px] text-ink-2" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-label={`${p}-sahifa`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
            className={p === page ? 'flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-control border border-navy bg-navy px-2 text-[13px] font-semibold text-white' : btn}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" aria-label="Keyingi sahifa" className={btn} disabled={page >= pages} onClick={() => onChange(page + 1)}>
        <ChevronIcon dir="right" size={14} />
      </button>
    </nav>
  )
}
