'use client'

import type { ContentLocale, Fill } from '@/shared/lib/admin/ltext'

export type LocaleFill = Record<ContentLocale, { state: Fill; missing?: number }>

const LABELS: Record<ContentLocale, string> = { uz: 'UZ', ru: 'RU', en: 'EN' }

export function FillDot({ state, size = 8 }: { state: Fill; size?: number }) {
  const cls = state === 'full' ? 'bg-(--am-ok) border-(--am-ok)' : state === 'partial' ? 'bg-(--am-warn-dot) border-(--am-warn-dot)' : 'bg-white border-[#A9A69F]'
  return <span aria-hidden className={`inline-block shrink-0 rounded-full border ${cls}`} style={{ width: size, height: size }} />
}

/** Tarjima holati uchun 3 ta nuqta (jadvallarda) */
export function FillDots({ value }: { value: { uz: boolean; ru: boolean; en: boolean } }) {
  const label = `Tarjima: UZ ${value.uz ? 'bor' : 'yo‘q'}, RU ${value.ru ? 'bor' : 'yo‘q'}, EN ${value.en ? 'bor' : 'yo‘q'}`
  return (
    <span role="img" aria-label={label} className="flex items-center gap-1.5">
      {(['uz', 'ru', 'en'] as const).map((l) => (
        <FillDot key={l} state={value[l] ? 'full' : 'empty'} />
      ))}
    </span>
  )
}

function aria(l: ContentLocale, f: { state: Fill; missing?: number }) {
  if (f.state === 'full') return `${LABELS[l]}, to‘liq to‘ldirilgan`
  if (f.state === 'partial') return `${LABELS[l]}, ${f.missing ?? ''} maydon tarjima qilinmagan`
  return `${LABELS[l]}, tarjima yo‘q`
}

/**
 * Kontent tili almashtirgichi (UZ / RU / EN) to‘ldirilganlik nuqtalari bilan.
 * variant="segment" — A4 (38px, ajratgichli), "pill" — A5 (30px ichki tugmalar).
 */
export function LocaleTabs({
  value,
  onChange,
  fill,
  variant = 'segment',
  labelId,
}: {
  value: ContentLocale
  onChange: (l: ContentLocale) => void
  fill?: Partial<LocaleFill>
  variant?: 'segment' | 'pill'
  labelId?: string
}) {
  const locales: ContentLocale[] = ['uz', 'ru', 'en']
  if (variant === 'pill') {
    return (
      <div role="group" aria-labelledby={labelId} aria-label={labelId ? undefined : 'Kontent tili'} className="flex gap-0.5 rounded-control border border-line-strong bg-white p-0.5">
        {locales.map((l) => {
          const on = l === value
          const f = fill?.[l] ?? { state: 'empty' as Fill }
          return (
            <button
              key={l}
              type="button"
              aria-pressed={on}
              aria-label={aria(l, f)}
              onClick={() => onChange(l)}
              className={`flex h-[30px] cursor-pointer items-center gap-2 rounded-[4px] border-0 px-3.5 text-[13px] ${on ? 'bg-navy-soft font-semibold text-navy' : 'bg-transparent font-medium text-ink-2 hover:bg-sand'}`}
            >
              {LABELS[l]}
              <FillDot state={f.state} />
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div role="group" aria-labelledby={labelId} aria-label={labelId ? undefined : 'Kontent tili'} className="flex overflow-hidden rounded-control border border-line-strong bg-white">
      {locales.map((l) => {
        const on = l === value
        const f = fill?.[l] ?? { state: 'empty' as Fill }
        return (
          <button
            key={l}
            type="button"
            aria-pressed={on}
            aria-label={aria(l, f)}
            onClick={() => onChange(l)}
            className={`flex h-[38px] cursor-pointer items-center gap-2 border-0 border-r border-line px-3.5 text-sm last:border-r-0 ${on ? 'bg-navy-soft font-semibold text-navy' : 'bg-white font-medium text-ink hover:bg-sand'}`}
          >
            <FillDot state={f.state} />
            {LABELS[l]}
            {f.state === 'partial' && f.missing ? <span className="text-xs font-medium text-(--am-warn)">{f.missing} maydon</span> : null}
          </button>
        )
      })}
    </div>
  )
}
