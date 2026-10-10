'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'

import { AdminButton } from './Button'

type Props = {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  pending?: boolean
  /** xavfli amal: tasdiq tugmasi matnli (qizil emas — ADMIN-SPEC) */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Native <dialog> + showModal(): fokus tuzog‘i, Esc, backdrop — brauzer tomonidan */
export function ConfirmDialog({ open, title, children, confirmLabel = 'Tasdiqlash', cancelLabel = 'Bekor qilish', pending, destructive, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (!pending) onCancel()
      }}
      className="am-dialog m-auto w-[min(440px,calc(100vw-32px))] rounded-card border border-line bg-white p-0 text-ink"
    >
      <div className="p-6">
        <h2 id={titleId} className="m-0 text-base font-semibold">
          {title}
        </h2>
        {children && <div className="mt-2 text-sm leading-normal text-ink-2">{children}</div>}
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <AdminButton onClick={onCancel} disabled={pending} data-autofocus>
          {cancelLabel}
        </AdminButton>
        <AdminButton variant={destructive ? 'secondary' : 'primary'} onClick={onConfirm} disabled={pending} className={destructive ? 'text-danger' : ''}>
          {pending ? 'Bajarilmoqda…' : confirmLabel}
        </AdminButton>
      </div>
    </dialog>
  )
}

/** Oddiy forma oynasi (yangi xodim, xizmat qo‘shish) */
export function FormDialog({ open, title, onClose, children, width = 520 }: { open: boolean; title: string; onClose: () => void; children: ReactNode; width?: number }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      style={{ width: `min(${width}px, calc(100vw - 32px))` }}
      className="am-dialog m-auto max-h-[calc(100dvh-32px)] rounded-card border border-line bg-white p-0 text-ink"
    >
      <div className="flex h-14 items-center border-b border-line px-6">
        <h2 id={titleId} className="m-0 text-[15px] font-semibold">
          {title}
        </h2>
      </div>
      {open && children}
    </dialog>
  )
}
