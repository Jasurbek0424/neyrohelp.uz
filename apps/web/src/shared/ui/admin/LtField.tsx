'use client'

import type { ReactNode } from 'react'

import { lt, setLt, type ContentLocale, type LText, type LTextLike } from '@/shared/lib/admin/ltext'

import { Field, inputClass } from './Field'

type Props = {
  label: ReactNode
  value: LTextLike | null | undefined
  onChange: (v: LText) => void
  locale: ContentLocale
  multiline?: boolean
  rows?: number
  maxLength?: number
  /** hisoblagich (masalan SEO 60/160) */
  counter?: number
  hint?: ReactNode
  error?: string
  className?: string
  inputClassName?: string
  placeholder?: string
  list?: string
}

/**
 * Ko‘p tilli maydon: joriy kontent tili qiymatini tahrirlaydi.
 * Tarjima bo‘sh bo‘lsa — placeholder'da o‘zbekcha matn va «saytda o‘zbekcha ko‘rsatiladi» eslatmasi.
 */
export function LtField({ label, value, onChange, locale, multiline, rows = 4, maxLength, counter, hint, error, className = '', inputClassName = '', placeholder, list }: Props) {
  const text = lt(value, locale)
  const uz = lt(value, 'uz')
  const fallback = locale !== 'uz' && !text.trim() && uz.trim()
  const limit = counter ?? maxLength
  const over = limit !== undefined && text.length > limit
  const note = fallback ? <span className="text-(--am-warn)">Tarjima yo‘q — saytda o‘zbekcha matn ko‘rsatiladi</span> : hint
  return (
    <Field
      className={className}
      label={
        <>
          {label}
          {locale !== 'uz' && <span className="ml-1.5 text-xs font-semibold text-ink-2">{locale.toUpperCase()}</span>}
        </>
      }
      error={error}
      hint={note}
      aside={limit !== undefined ? <span className={`text-xs tabular-nums ${over ? 'font-semibold text-danger' : 'text-ink-2'}`}>{text.length} / {limit}</span> : undefined}
    >
      {({ id, describedBy, invalid }) =>
        multiline ? (
          <textarea
            id={id}
            rows={rows}
            aria-describedby={describedBy}
            aria-invalid={invalid || over || undefined}
            maxLength={maxLength}
            placeholder={fallback ? uz : placeholder}
            className={`${inputClass} h-auto resize-none py-2.5 leading-normal ${inputClassName}`}
            value={text}
            onChange={(e) => onChange(setLt(value, locale, e.target.value))}
          />
        ) : (
          <input
            id={id}
            type="text"
            list={list}
            aria-describedby={describedBy}
            aria-invalid={invalid || over || undefined}
            maxLength={maxLength}
            placeholder={fallback ? uz : placeholder}
            className={`${inputClass} ${inputClassName}`}
            value={text}
            onChange={(e) => onChange(setLt(value, locale, e.target.value))}
          />
        )
      }
    </Field>
  )
}
