'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import { CloseIcon } from './icons'

type Props = {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  /**
   * inline — ro‘yxat yonida joy egallaydi (dizayn A3: jadval bilan birga ishlash, ↑/↓ bilan
   * qatorlar almashadi). Native <dialog> `show()` — fokus ichkariga o‘tadi, Esc yopadi,
   * Tab panel ichida aylanadi.
   * modal — `showModal()` (top-layer, backdrop, brauzerning o‘z fokus tuzog‘i).
   */
  mode?: 'inline' | 'modal'
  width?: number
  labelledBy?: string
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Drawer({ open, onClose, title, children, footer, mode = 'inline', width = 420 }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      returnFocus.current = document.activeElement as HTMLElement | null
      if (mode === 'modal') d.showModal()
      else d.show()
      // fokus: birinchi interaktiv element (yopish tugmasidan keyingisi bo‘lsa yaxshiroq)
      requestAnimationFrame(() => {
        const first = d.querySelector<HTMLElement>('[data-autofocus]') ?? d.querySelector<HTMLElement>(FOCUSABLE)
        first?.focus()
      })
    } else if (!open && d.open) {
      d.close()
      returnFocus.current?.focus?.()
    }
  }, [open, mode])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCloseRef.current()
      return
    }
    if (e.key !== 'Tab' || mode === 'modal') return
    // inline rejimda ham Tab panel ichida aylansin (fokus tuzog‘i)
    const items = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => el.offsetParent !== null)
    if (!items.length) return
    const first = items[0]!
    const last = items[items.length - 1]!
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const position =
    mode === 'modal'
      ? 'fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none max-w-full'
      : 'static m-0 h-full shrink-0 shadow-[var(--am-shadow)]'

  return (
    <dialog
      ref={ref}
      aria-modal={mode === 'modal' ? true : undefined}
      onCancel={(e) => {
        e.preventDefault()
        onCloseRef.current()
      }}
      onKeyDown={onKeyDown}
      style={{ width }}
      className={`am-dialog flex-col border-0 border-l border-line bg-white p-0 text-ink open:flex ${position}`}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-6">
        <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
        <button
          type="button"
          onClick={() => onCloseRef.current()}
          aria-label="Panelni yopish"
          className="am-btn-o flex size-8 cursor-pointer items-center justify-center rounded-control border border-line bg-white"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">{children}</div>
      {footer}
    </dialog>
  )
}
