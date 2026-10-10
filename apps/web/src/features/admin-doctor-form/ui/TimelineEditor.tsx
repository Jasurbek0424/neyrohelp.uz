'use client'

import { useState } from 'react'

import { lt, setLt, type ContentLocale, type LText } from '@/shared/lib/admin/ltext'
import { inputClass } from '@/shared/ui/admin/Field'
import { GripIcon, Icon, PlusIcon } from '@/shared/ui/admin/icons'

type Row = { years: string; place: LText; detail: LText }

const cols = 'grid grid-cols-[28px_140px_minmax(0,1fr)_220px_36px] items-center gap-3'

/** Ta’lim / tajriba qatorlari: sudrab yoki grip tugmasida ↑/↓ bilan tartiblash */
export function TimelineEditor({
  title,
  description,
  rows,
  onChange,
  locale,
  detailLabel = 'Daraja',
}: {
  title: string
  description?: string
  rows: Row[]
  onChange: (rows: Row[]) => void
  locale: ContentLocale
  detailLabel?: string
}) {
  const [drag, setDrag] = useState<number | null>(null)
  const [live, setLive] = useState('')
  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length || from === to) return
    const next = [...rows]
    const [r] = next.splice(from, 1)
    next.splice(to, 0, r!)
    onChange(next)
    setLive(`${from + 1}-qator ${to + 1}-o‘ringa ko‘chirildi`)
  }
  const patch = (i: number, p: Partial<Row>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const ph = (v: LText) => (locale !== 'uz' && !lt(v, locale) ? lt(v, 'uz') : undefined)

  return (
    <section aria-label={title} className="w-full max-w-[920px] rounded-card border border-line bg-white p-6">
      <h2 className="m-0 text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 mb-0 text-[13px] text-ink-2">{description}</p>}
      <div aria-hidden className={`${cols} mt-4 text-xs font-medium text-ink-2`}>
        <span />
        <span>Yillar</span>
        <span>Muassasa</span>
        <span>{detailLabel}</span>
        <span />
      </div>
      <ol className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
        {rows.map((r, i) => (
          <li
            key={i}
            className={`${cols} ${drag === i ? 'opacity-50' : ''}`}
            draggable={drag === i}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (drag !== null) move(drag, i)
              setDrag(null)
            }}
            onDragEnd={() => setDrag(null)}
          >
            <button
              type="button"
              aria-label={`${i + 1}-qatorni ko‘chirish (↑/↓ tugmalari)`}
              className="am-ghost flex h-10 w-7 cursor-grab items-center justify-center rounded-control border-0 bg-transparent p-0"
              onMouseDown={() => setDrag(i)}
              onMouseUp={() => setDrag(null)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault()
                  const to = i + (e.key === 'ArrowUp' ? -1 : 1)
                  move(i, to)
                  requestAnimationFrame(() => (e.currentTarget.closest('ol')?.children[to]?.querySelector('button') as HTMLElement | null)?.focus())
                }
              }}
            >
              <GripIcon />
            </button>
            <input aria-label={`${i + 1}-qator: yillar`} className={`${inputClass} tabular-nums`} maxLength={40} value={r.years} onChange={(e) => patch(i, { years: e.target.value })} placeholder="2009–2011" />
            <input aria-label={`${i + 1}-qator: muassasa`} className={inputClass} maxLength={2000} value={lt(r.place, locale)} placeholder={ph(r.place)} onChange={(e) => patch(i, { place: setLt(r.place, locale, e.target.value) })} />
            <input aria-label={`${i + 1}-qator: ${detailLabel.toLowerCase()}`} className={inputClass} maxLength={2000} value={lt(r.detail, locale)} placeholder={ph(r.detail)} onChange={(e) => patch(i, { detail: setLt(r.detail, locale, e.target.value) })} />
            <button
              type="button"
              aria-label={`${i + 1}-qatorni o‘chirish`}
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              className="am-btn-o flex size-9 cursor-pointer items-center justify-center rounded-control border border-line bg-white p-0 text-ink-2"
            >
              <Icon name="trash" size={16} />
            </button>
          </li>
        ))}
      </ol>
      {!rows.length && <p className="mt-2 text-sm text-ink-2">Hali qator yo‘q.</p>}
      <button
        type="button"
        onClick={() => onChange([...rows, { years: '', place: { uz: '', ru: '', en: '' }, detail: { uz: '', ru: '', en: '' } }])}
        className="am-btn-o mt-4 flex h-9 cursor-pointer items-center gap-2 rounded-control border border-line-strong bg-white px-3.5 text-sm font-medium"
      >
        <PlusIcon size={12} />
        Qator qo‘shish
      </button>
      <div role="status" className="sr-only">
        {live}
      </div>
    </section>
  )
}
