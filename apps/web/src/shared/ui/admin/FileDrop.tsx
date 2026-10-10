'use client'

import { useId, useRef, useState, type ReactNode } from 'react'

import { Icon } from './icons'

type Props = {
  onFile: (file: File) => void
  accept?: string
  label: string
  title?: ReactNode
  hint?: ReactNode
  busy?: boolean
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
}

/** Fayl tanlash yoki sudrab tashlash maydoni (haqiqiy <button> + yashirin <input type=file>) */
export function FileDrop({ onFile, accept = 'image/jpeg,image/png,image/webp', label, title = 'Rasmni shu yerga tashlang yoki tanlang', hint, busy, className = '', style, children }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const id = useId()
  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-describedby={hint ? `${id}-h` : undefined}
        aria-busy={busy}
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) onFile(f)
        }}
        style={style}
        className={`am-btn-o relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-card border border-dashed p-3 text-center text-ink disabled:cursor-wait ${over ? 'border-navy bg-navy-soft' : 'border-field bg-white'} ${className}`}
      >
        {children ?? (
          <>
            <span className="text-ink-2">
              <Icon name="upload" size={28} />
            </span>
            <span className="text-[13px] leading-snug font-medium">{busy ? 'Yuklanmoqda…' : title}</span>
            {hint && (
              <span id={`${id}-h`} className="text-xs leading-snug text-ink-2">
                {hint}
              </span>
            )}
          </>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
    </>
  )
}
