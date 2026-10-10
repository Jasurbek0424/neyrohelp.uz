'use client'

import { useState, type FormEvent } from 'react'
import { z } from 'zod'

import { useSaveService, type Service, type ServiceCategory } from '@/entities/admin-service'
import { groupDigits, parseDigits } from '@/shared/lib/admin/format'
import { errorMessage, fieldErrorsFrom, zodErrors } from '@/shared/lib/admin/form-errors'
import { cleanLt, ltOr, toLt, type LText } from '@/shared/lib/admin/ltext'
import { AdminButton } from '@/shared/ui/admin/Button'
import { FormDialog } from '@/shared/ui/admin/ConfirmDialog'
import { AffixInput, Field, Select } from '@/shared/ui/admin/Field'
import { Switch } from '@/shared/ui/admin/Switch'
import { toast } from '@/shared/ui/admin/Toast'

const schema = z.object({
  category_id: z.number({ message: 'Yo‘nalishni tanlang' }).int().min(1, 'Yo‘nalishni tanlang'),
  title_uz: z.string().trim().min(1, 'O‘zbekcha nomini kiriting').max(200, 'Juda uzun'),
  duration: z.number().int().min(1, 'Kamida 1 daqiqa').max(1440, 'Ko‘pi bilan 1440 daqiqa').nullable(),
})

type Props = { open: boolean; onClose: () => void; categories: ServiceCategory[]; service?: Service | null; defaultCategoryId?: number }

/** Xizmat qo‘shish / tahrirlash (nom va izoh — 3 tilda) */
export function ServiceDialog({ open, onClose, categories, service, defaultCategoryId }: Props) {
  return (
    <FormDialog open={open} onClose={onClose} title={service ? 'Xizmatni tahrirlash' : 'Xizmat qo‘shish'} width={560}>
      <ServiceForm key={service?.id ?? 'new'} onClose={onClose} categories={categories} service={service} defaultCategoryId={defaultCategoryId} />
    </FormDialog>
  )
}

function ServiceForm({ onClose, categories, service, defaultCategoryId }: Omit<Props, 'open'>) {
  const save = useSaveService()
  const [categoryId, setCategoryId] = useState<number>(service?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? 0)
  const [title, setTitle] = useState<LText>(() => toLt(service?.title))
  const [note, setNote] = useState<LText>(() => toLt(service?.note))
  const [duration, setDuration] = useState<number | null>(service?.duration_minutes ?? null)
  const [price, setPrice] = useState<number | null>(service?.price ?? null)
  const [active, setActive] = useState(service?.is_active ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = schema.safeParse({ category_id: categoryId, title_uz: title.uz ?? '', duration })
    if (!parsed.success) return setErrors(zodErrors(parsed.error.issues))
    setErrors({})
    const body = {
      category_id: categoryId,
      title: cleanLt(title),
      note: cleanLt(note),
      duration_minutes: duration,
      price,
      price_from: service?.price_from ?? false,
      is_active: active,
    }
    save.mutate(
      { id: service?.id, body },
      {
        onSuccess: () => {
          toast.success(service ? 'Xizmat saqlandi' : 'Xizmat qo‘shildi')
          onClose()
        },
        onError: (err) => {
          const f = fieldErrorsFrom(err)
          setErrors({ title_uz: f['title.uz'] ?? f.title ?? '', duration: f.duration_minutes ?? '', category_id: f.category_id ?? '' })
          toast.error(errorMessage(err))
        },
      },
    )
  }

  const ltRow = (labelText: string, value: LText, set: (v: LText) => void, errKey?: string) => (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-1.5 text-[13px] font-medium">{labelText}</legend>
      <div className="grid gap-2">
        {(['uz', 'ru', 'en'] as const).map((l) => (
          <Field key={l} error={l === 'uz' && errKey ? errors[errKey] : undefined}>
            {({ id, describedBy, invalid }) => (
              <AffixInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                aria-label={`${labelText} (${l.toUpperCase()})`}
                prefix={<span className="w-6 text-center font-semibold">{l.toUpperCase()}</span>}
                value={value[l] ?? ''}
                maxLength={l === 'uz' ? 200 : 2000}
                onChange={(e) => set({ ...value, [l]: e.target.value })}
              />
            )}
          </Field>
        ))}
      </div>
    </fieldset>
  )

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex max-h-[calc(100dvh-180px)] flex-col gap-4 overflow-y-auto p-6">
        <Field label="Yo‘nalish" error={errors.category_id}>
          {({ id, invalid }) => (
            <Select id={id} aria-invalid={invalid || undefined} value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {ltOr(c.title)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {ltRow('Nomi', title, setTitle, 'title_uz')}
        {ltRow('Qisqa izoh', note, setNote)}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Davomiylik" error={errors.duration}>
            {({ id, invalid }) => (
              <AffixInput id={id} invalid={invalid} inputMode="numeric" suffix="daq" inputClassName="text-right tabular-nums" value={duration ?? ''} onChange={(e) => setDuration(parseDigits(e.target.value, 4))} />
            )}
          </Field>
          <Field label="Narx" hint="Bo‘sh — «Administrator aytadi»">
            {({ id, describedBy }) => (
              <AffixInput id={id} aria-describedby={describedBy} inputMode="numeric" suffix="so‘m" placeholder="Narx yo‘q" inputClassName="text-right tabular-nums" value={groupDigits(price)} onChange={(e) => setPrice(parseDigits(e.target.value, 10))} />
            )}
          </Field>
        </div>
        <Switch label="Saytda ko‘rsatish" checked={active} onChange={setActive} />
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <AdminButton onClick={onClose} disabled={save.isPending}>
          Bekor qilish
        </AdminButton>
        <AdminButton type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
        </AdminButton>
      </div>
    </form>
  )
}
