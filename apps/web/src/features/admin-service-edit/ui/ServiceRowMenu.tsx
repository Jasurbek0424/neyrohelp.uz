'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { useDeleteService, useSaveService, type Service } from '@/entities/admin-service'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { ltOr } from '@/shared/lib/admin/ltext'
import { ConfirmDialog } from '@/shared/ui/admin/ConfirmDialog'
import { Icon } from '@/shared/ui/admin/icons'
import { toast } from '@/shared/ui/admin/Toast'

/** «…» amallar menyusi: tahrirlash · yashirish/ko‘rsatish · o‘chirish */
export function ServiceRowMenu({ service, onEdit }: { service: Service; onEdit: () => void }) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const save = useSaveService()
  const del = useDeleteService()
  const name = ltOr(service.title)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus())
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const item = 'am-ghost flex h-9 w-full cursor-pointer items-center rounded-[4px] border-0 bg-transparent px-2.5 text-left text-sm text-ink'
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`${name}: amallar`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="am-btn-o flex size-8 cursor-pointer items-center justify-center rounded-control border border-line bg-white text-ink-2"
      >
        <Icon name="dots" size={16} strokeWidth={3} />
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={`${name}: amallar`} className="absolute top-9 right-0 z-20 w-52 rounded-control border border-line bg-white p-1 shadow-[var(--am-shadow)]">
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
          >
            Tahrirlash
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false)
              save.mutate(
                { id: service.id, body: { is_active: !service.is_active } },
                { onSuccess: () => toast.success(service.is_active ? 'Xizmat saytdan yashirildi' : 'Xizmat saytda ko‘rinadi'), onError: (e) => toast.error(errorMessage(e)) },
              )
            }}
          >
            {service.is_active ? 'Saytdan yashirish' : 'Saytda ko‘rsatish'}
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${item} text-ink-2`}
            onClick={() => {
              setOpen(false)
              setConfirm(true)
            }}
          >
            O‘chirish
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        destructive
        title="Xizmatni o‘chirasizmi?"
        confirmLabel="O‘chirish"
        pending={del.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          del.mutate(service.id, {
            onSuccess: () => {
              setConfirm(false)
              toast.success('Xizmat o‘chirildi')
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      >
        «{name}» saytdan butunlay o‘chiriladi. Faqat vaqtincha yashirish kerak bo‘lsa — «Saytdan yashirish»ni tanlang.
      </ConfirmDialog>
    </div>
  )
}
