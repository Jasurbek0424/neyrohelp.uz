'use client'

import { useState, type FormEvent } from 'react'
import { z } from 'zod'

import { useCreateUser } from '@/entities/admin-user'
import { roleLabels, type Role } from '@/entities/session'
import { errorMessage, fieldErrorsFrom, zodErrors } from '@/shared/lib/admin/form-errors'
import { AdminButton } from '@/shared/ui/admin/Button'
import { FormDialog } from '@/shared/ui/admin/ConfirmDialog'
import { Field, Input, Select } from '@/shared/ui/admin/Field'
import { toast } from '@/shared/ui/admin/Toast'

const schema = z.object({
  name: z.string().trim().min(2, 'Ism kamida 2 belgi').max(120, 'Juda uzun'),
  email: z.string().trim().pipe(z.email({ message: 'Email manzili noto‘g‘ri' })),
  role: z.enum(['admin', 'editor', 'operator']),
  password: z.string().min(12, 'Parol kamida 12 belgi').max(256, 'Juda uzun'),
})

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const create = useCreateUser()
  const [form, setForm] = useState({ name: '', email: '', role: 'operator' as Role, password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = schema.safeParse(form)
    if (!parsed.success) return setErrors(zodErrors(parsed.error.issues))
    setErrors({})
    create.mutate(parsed.data, {
      onSuccess: () => {
        toast.success('Xodim qo‘shildi. Parolni unga xavfsiz kanal orqali bering.')
        onClose()
      },
      onError: (err) => {
        const f = fieldErrorsFrom(err)
        if ((err as { status?: number }).status === 409) f.email = 'Bu email bilan xodim allaqachon bor'
        setErrors(f)
        toast.error(errorMessage(err))
      },
    })
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-col gap-4 p-6">
        <Field label="Ism" error={errors.name}>
          {({ id, invalid }) => <Input id={id} autoComplete="off" aria-invalid={invalid || undefined} value={form.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>
        <Field label="Email" error={errors.email}>
          {({ id, invalid }) => <Input id={id} type="email" autoComplete="off" aria-invalid={invalid || undefined} value={form.email} onChange={(e) => set('email', e.target.value)} />}
        </Field>
        <Field label="Rol" hint="Operator — faqat arizalar; muharrir — kontent va blog; administrator — hammasi.">
          {({ id, describedBy }) => (
            <Select id={id} aria-describedby={describedBy} value={form.role} onChange={(e) => set('role', e.target.value)}>
              {(['operator', 'editor', 'admin'] as const).map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Vaqtinchalik parol" error={errors.password} hint="Kamida 12 belgi. Xodim birinchi kirishda o‘zgartiradi.">
          {({ id, describedBy, invalid }) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={describedBy} aria-invalid={invalid || undefined} value={form.password} onChange={(e) => set('password', e.target.value)} />}
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <AdminButton onClick={onClose} disabled={create.isPending}>
          Bekor qilish
        </AdminButton>
        <AdminButton type="submit" variant="primary" disabled={create.isPending}>
          {create.isPending ? 'Qo‘shilmoqda…' : 'Qo‘shish'}
        </AdminButton>
      </div>
    </form>
  )
}

export function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <FormDialog open={open} onClose={onClose} title="Xodim qo‘shish" width={480}>
      <CreateUserForm onClose={onClose} />
    </FormDialog>
  )
}
