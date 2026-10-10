'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'

import { adminPaths, changePassword, clearClientState, postAuthMessage } from '@/entities/session'
import { errorMessage, fieldErrorsFrom, zodErrors } from '@/shared/lib/admin/form-errors'
import { AdminButton } from '@/shared/ui/admin/Button'
import { Card } from '@/shared/ui/admin/Table'
import { Field, Input } from '@/shared/ui/admin/Field'
import { toast } from '@/shared/ui/admin/Toast'

const schema = z
  .object({
    current: z.string().min(1, 'Joriy parolni kiriting'),
    next: z.string().min(12, 'Yangi parol kamida 12 belgi').max(256, 'Juda uzun'),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ['confirm'], message: 'Parollar mos kelmadi' })
  .refine((v) => v.next !== v.current, { path: ['next'], message: 'Yangi parol joriysidan farq qilishi kerak' })

/** Parol o‘zgarsa backend barcha sessiyalarni bekor qiladi → lokal holat tozalanib, qayta kirishga o‘tiladi */
export function ChangePasswordForm() {
  const qc = useQueryClient()
  const router = useRouter()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const m = useMutation({
    mutationFn: () => changePassword({ current: form.current, new: form.next }),
    onSuccess: () => {
      clearClientState(qc)
      postAuthMessage({ type: 'logout' })
      toast.success('Parol o‘zgartirildi. Yangi parol bilan qayta kiring.')
      router.replace(adminPaths.login)
    },
    onError: (e) => {
      const f = fieldErrorsFrom(e)
      setErrors({ current: f.current ?? (['wrong_password', 'invalid_password', 'invalid_credentials'].includes((e as { detail?: string }).detail ?? '') ? 'Joriy parol noto‘g‘ri' : ''), next: f.new ?? '' })
      toast.error(errorMessage(e))
    },
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = schema.safeParse(form)
    if (!parsed.success) return setErrors(zodErrors(parsed.error.issues))
    setErrors({})
    m.mutate()
  }
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <Card aria-labelledby="pw-title" className="p-6">
      <h2 id="pw-title" className="m-0 text-base font-semibold">
        Parolni o‘zgartirish
      </h2>
      <p className="mt-1 mb-0 text-[13px] text-ink-2">O‘zgartirilgach barcha qurilmalardagi sessiyalar yopiladi.</p>
      <form onSubmit={submit} noValidate className="mt-4 flex max-w-[400px] flex-col gap-4">
        <input type="text" name="username" autoComplete="username" hidden readOnly />
        <Field label="Joriy parol" error={errors.current}>
          {({ id, invalid }) => <Input id={id} type="password" autoComplete="current-password" aria-invalid={invalid || undefined} value={form.current} onChange={(e) => set('current', e.target.value)} />}
        </Field>
        <Field label="Yangi parol" error={errors.next} hint="Kamida 12 belgi. Uzun ibora — qisqa murakkab paroldan xavfsizroq.">
          {({ id, describedBy, invalid }) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={describedBy} aria-invalid={invalid || undefined} value={form.next} onChange={(e) => set('next', e.target.value)} />}
        </Field>
        <Field label="Yangi parolni takrorlang" error={errors.confirm}>
          {({ id, invalid }) => <Input id={id} type="password" autoComplete="new-password" aria-invalid={invalid || undefined} value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />}
        </Field>
        <div>
          <AdminButton type="submit" variant="primary" disabled={m.isPending}>
            {m.isPending ? 'Saqlanmoqda…' : 'Parolni o‘zgartirish'}
          </AdminButton>
        </div>
      </form>
    </Card>
  )
}
