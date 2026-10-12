'use client'

import { useState } from 'react'

import { useRevokeSessions, useSetUserPassword, useUpdateUser, type AdminUser } from '@/entities/admin-user'
import { roleLabels, type Role } from '@/entities/session'
import { errorMessage, fieldErrorsFrom } from '@/shared/lib/admin/form-errors'
import { strongPassword } from '@/shared/lib/admin/password'
import { AdminButton } from '@/shared/ui/admin/Button'
import { PasswordField } from '@/shared/ui/admin/PasswordField'
import { ConfirmDialog, FormDialog } from '@/shared/ui/admin/ConfirmDialog'
import { Select } from '@/shared/ui/admin/Field'
import { Icon, type IconName } from '@/shared/ui/admin/icons'
import { toast } from '@/shared/ui/admin/Toast'

import { EditUserDialog } from './EditUserDialog'

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

/** Administrator xodimga yangi parol beradi — eski sessiyalari yopiladi */
function SetPasswordDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const set = useSetUserPassword()
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const parsed = strongPassword().safeParse(pw)
        if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? '')
        setError('')
        set.mutate(
          { id: user.id, password: parsed.data },
          {
            onSuccess: () => {
              toast.success(`${user.name}: yangi parol saqlandi. Uni xodimga shaxsan bering.`)
              onClose()
            },
            onError: (err) => setError(fieldErrorsFrom(err).password ?? errorMessage(err)),
          },
        )
      }}
    >
      <div className="flex flex-col gap-3 p-6">
        <p className="m-0 text-[13px] text-ink-2">
          {user.email} uchun yangi parol. Saqlangach xodim barcha qurilmalarda tizimdan chiqariladi va yangi parol bilan kiradi.
        </p>
        <PasswordField label="Yangi parol" value={pw} onChange={setPw} error={error} />
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <AdminButton onClick={onClose} disabled={set.isPending}>
          Bekor qilish
        </AdminButton>
        <AdminButton type="submit" variant="primary" disabled={set.isPending}>
          {set.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
        </AdminButton>
      </div>
    </form>
  )
}

/** Ikonkali amal: yozuv aria-label va tooltip'da (hover/focus), xavfli amal hover'da qizil */
function IconAction({ icon, label, onClick, disabled, danger }: { icon: IconName; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`group/tip relative flex size-9 cursor-pointer items-center justify-center rounded-control border-0 bg-transparent text-ink-2 transition-colors hover:bg-(--am-bg) focus-visible:bg-(--am-bg) disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent ${danger ? 'hover:text-danger' : 'hover:text-ink'}`}
    >
      <Icon name={icon} size={18} />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded-[4px] bg-ink px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 transition-opacity group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100 group-disabled/tip:hidden"
      >
        {label}
      </span>
    </button>
  )
}

/** Tahrirlash (ism, email), parol berish, faollashtirish/bloklash, barcha sessiyalarni bekor qilish */
export function UserRowActions({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const update = useUpdateUser()
  const revoke = useRevokeSessions()
  const [confirm, setConfirm] = useState<null | 'block' | 'revoke'>(null)
  const [pwOpen, setPwOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  return (
    <div className="flex items-center justify-end gap-1">
      <IconAction icon="edit" label="Tahrirlash" onClick={() => setEditOpen(true)} />
      <IconAction icon="key" label="Parol berish" disabled={isSelf} onClick={() => setPwOpen(true)} />
      <IconAction icon="logout" label="Sessiyalarni yopish" disabled={isSelf} onClick={() => setConfirm('revoke')} />
      {user.is_active ? (
        <IconAction icon="ban" label="Bloklash" danger disabled={isSelf} onClick={() => setConfirm('block')} />
      ) : (
        <IconAction
          icon="check-circle"
          label="Faollashtirish"
          disabled={isSelf}
          onClick={() => update.mutate({ id: user.id, patch: { is_active: true } }, { onSuccess: () => toast.success(`${user.name} faollashtirildi`), onError: (e) => toast.error(errorMessage(e)) })}
        />
      )}
      <EditUserDialog user={user} open={editOpen} onClose={() => setEditOpen(false)} />
      <FormDialog open={pwOpen} onClose={() => setPwOpen(false)} title={`${user.name}: parol berish`} width={560}>
        {pwOpen && <SetPasswordDialog user={user} onClose={() => setPwOpen(false)} />}
      </FormDialog>
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
