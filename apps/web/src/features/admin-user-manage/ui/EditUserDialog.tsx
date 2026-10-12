'use client'

import { useState, type FormEvent } from 'react'
import { z } from 'zod'

import { useUpdateUser, type AdminUser } from '@/entities/admin-user'
import { errorMessage, fieldErrorsFrom, zodErrors } from '@/shared/lib/admin/form-errors'
import { AdminButton } from '@/shared/ui/admin/Button'
import { FormDialog } from '@/shared/ui/admin/ConfirmDialog'
import { Field, Input } from '@/shared/ui/admin/Field'
import { toast } from '@/shared/ui/admin/Toast'

const schema = z.object({
  name: z.string().trim().min(2, 'Ism kamida 2 belgi').max(120, 'Juda uzun'),
  email: z.string().trim().toLowerCase().pipe(z.email({ message: 'Email manzili noto‘g‘ri' })),
})

function EditUserForm({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const update = useUpdateUser()
  const [form, setForm] = useState({ name: user.name, email: user.email })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = schema.safeParse(form)
    if (!parsed.success) return setErrors(zodErrors(parsed.error.issues))
    setErrors({})
    // Faqat o‘zgargan maydonlar yuboriladi
    const patch = {
      ...(parsed.data.name !== user.name && { name: parsed.data.name }),
      ...(parsed.data.email !== user.email && { email: parsed.data.email }),
    }
    if (!Object.keys(patch).length) return onClose()
    update.mutate(
      { id: user.id, patch },
      {
        onSuccess: () => {
          toast.success(patch.email ? 'Saqlandi. Xodim endi yangi email bilan kiradi.' : 'Saqlandi')
          onClose()
        },
        onError: (err) => {
          const f = fieldErrorsFrom(err)
          if ((err as { status?: number }).status === 409) f.email = 'Bu email bilan xodim allaqachon bor'
          setErrors(f)
          toast.error(errorMessage(err))
        },
      },
    )
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-col gap-4 p-6">
        <Field label="Ism" error={errors.name}>
          {({ id, invalid }) => <Input id={id} autoComplete="off" aria-invalid={invalid || undefined} value={form.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>
        <Field label="Email" error={errors.email} hint="Login uchun ishlatiladi. Parol va sessiyalar o‘zgarmaydi.">
          {({ id, invalid, describedBy }) => (
            <Input id={id} type="email" autoComplete="off" aria-invalid={invalid || undefined} aria-describedby={describedBy} value={form.email} onChange={(e) => set('email', e.target.value)} />
          )}
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <AdminButton onClick={onClose} disabled={update.isPending}>
          Bekor qilish
        </AdminButton>
        <AdminButton type="submit" variant="primary" disabled={update.isPending}>
          {update.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
        </AdminButton>
      </div>
    </form>
  )
}

export function EditUserDialog({ user, open, onClose }: { user: AdminUser; open: boolean; onClose: () => void }) {
  return (
    <FormDialog open={open} onClose={onClose} title={`${user.name}: tahrirlash`} width={480}>
      {open && <EditUserForm user={user} onClose={onClose} />}
    </FormDialog>
  )
}
