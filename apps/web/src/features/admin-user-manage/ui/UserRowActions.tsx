'use client'

import { useState } from 'react'

import { useRevokeSessions, useUpdateUser, type AdminUser } from '@/entities/admin-user'
import { roleLabels, type Role } from '@/entities/session'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { ConfirmDialog } from '@/shared/ui/admin/ConfirmDialog'
import { Select } from '@/shared/ui/admin/Field'
import { toast } from '@/shared/ui/admin/Toast'

/** Rolni almashtirish (optimistic) */
export function UserRoleSelect({ user, disabled }: { user: AdminUser; disabled?: boolean }) {
  const update = useUpdateUser()
  return (
    <Select
      aria-label={`${user.name}: rol`}
      wrapperClassName="w-44"
      className="h-9!"
      disabled={disabled}
      value={user.role}
      onChange={(e) =>
        update.mutate(
          { id: user.id, patch: { role: e.target.value as Role } },
          { onSuccess: () => toast.success(`${user.name}: rol o‘zgartirildi`), onError: (err) => toast.error(errorMessage(err)) },
        )
      }
    >
      {(['admin', 'editor', 'operator'] as const).map((r) => (
        <option key={r} value={r}>
          {roleLabels[r]}
        </option>
      ))}
    </Select>
  )
}

/** Faollashtirish/bloklash + barcha sessiyalarni bekor qilish */
export function UserRowActions({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const update = useUpdateUser()
  const revoke = useRevokeSessions()
  const [confirm, setConfirm] = useState<null | 'block' | 'revoke'>(null)
  const link = 'am-link cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium text-ink disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className="flex items-center justify-end gap-4">
      <button type="button" className={link} disabled={isSelf} onClick={() => setConfirm('revoke')}>
        Sessiyalarni yopish
      </button>
      <button
        type="button"
        className={link}
        disabled={isSelf}
        onClick={() =>
          user.is_active
            ? setConfirm('block')
            : update.mutate({ id: user.id, patch: { is_active: true } }, { onSuccess: () => toast.success(`${user.name} faollashtirildi`), onError: (e) => toast.error(errorMessage(e)) })
        }
      >
        {user.is_active ? 'Bloklash' : 'Faollashtirish'}
      </button>
      <ConfirmDialog
        open={confirm !== null}
        destructive
        title={confirm === 'block' ? `${user.name}ni bloklaysizmi?` : `${user.name}ning barcha sessiyalarini yopasizmi?`}
        confirmLabel={confirm === 'block' ? 'Bloklash' : 'Sessiyalarni yopish'}
        pending={update.isPending || revoke.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const done = { onSuccess: () => (setConfirm(null), toast.success('Bajarildi')), onError: (e: unknown) => (setConfirm(null), toast.error(errorMessage(e))) }
          if (confirm === 'block') update.mutate({ id: user.id, patch: { is_active: false } }, done)
          else revoke.mutate(user.id, done)
        }}
      >
        {confirm === 'block' ? 'Xodim tizimga kira olmaydi, ochiq sessiyalari yopiladi. Keyin qayta faollashtirish mumkin.' : 'Xodim barcha qurilmalarda tizimdan chiqariladi va qayta kirishi kerak bo‘ladi.'}
      </ConfirmDialog>
    </div>
  )
}
