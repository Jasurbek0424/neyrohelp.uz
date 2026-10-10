'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { useSaveSettings, type SettingsKey, type SettingsValue } from '@/entities/admin-settings'
import { dashboardKeys } from '@/entities/lead'
import { MediaThumb, useUploadMedia, validateUpload, type Media } from '@/entities/media'
import { useAdminUi } from '@/entities/session'
import { errorMessage, fieldErrorsFrom } from '@/shared/lib/admin/form-errors'
import { lt, setLt, type ContentLocale, type LText } from '@/shared/lib/admin/ltext'
import { useUnsavedChangesGuard } from '@/shared/lib/hooks/useUnsavedChangesGuard'
import { AdminButton } from '@/shared/ui/admin/Button'
import { Field, Input, Select } from '@/shared/ui/admin/Field'
import { FileDrop } from '@/shared/ui/admin/FileDrop'
import { Icon, PlusIcon } from '@/shared/ui/admin/icons'
import { LocaleTabs } from '@/shared/ui/admin/LocaleTabs'
import { LtField } from '@/shared/ui/admin/LtField'
import { StatusTag } from '@/shared/ui/admin/StatusTag'
import { toast } from '@/shared/ui/admin/Toast'

import { mediaKeyOf, settingsSchema, type FieldDef } from '../model/fields'
import { localeFill, newItem, normalize, toPayload, validate } from '../model/payload'

type Obj = Record<string, unknown>
type Ctx = { locale: ContentLocale; errors: Record<string, string> }

function MediaField({ def, value, media, onChange }: { def: Extract<FieldDef, { kind: 'media' }>; value: string | null; media: Media | null; onChange: (id: string | null, m: Media | null) => void }) {
  const upload = useUploadMedia()
  const onFile = (file: File) => {
    const err = validateUpload(file, def.accept === 'document' ? 'any' : 'image')
    if (err) return toast.error(err)
    upload.mutate({ file }, { onSuccess: (m) => onChange(m.id, m), onError: (e) => toast.error(errorMessage(e, 'Faylni yuklab bo‘lmadi')) })
  }
  return (
    <div>
      <div className="mb-1.5 text-[13px] font-medium">{def.label}</div>
      <div className="flex items-center gap-3">
        <FileDrop
          label={`${def.label}: ${value ? 'almashtirish' : 'yuklash'}`}
          onFile={onFile}
          busy={upload.isPending}
          accept={def.accept === 'document' ? 'application/pdf,image/jpeg,image/png,image/webp' : undefined}
          style={{ width: 96, height: 72, padding: 0 }}
        >
          {media?.kind === 'image' ? <MediaThumb media={media} width={94} height={70} rounded={9} /> : <Icon name={value ? 'posts' : 'upload'} size={22} />}
        </FileDrop>
        <div className="flex flex-col items-start gap-1 text-xs text-ink-2">
          {value ? <StatusTag tone="ok">{media?.kind === 'document' || def.accept === 'document' ? 'Fayl yuklangan' : 'Yuklangan'}</StatusTag> : <StatusTag tone="warn">{def.accept === 'document' ? 'Fayl yo‘q' : 'Rasm yo‘q'}</StatusTag>}
          {value && (
            <button type="button" onClick={() => onChange(null, null)} className="am-link cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-ink">
              Olib tashlash
            </button>
          )}
          {media?.kind === 'document' && (
            <a href={media.url} target="_blank" rel="noopener noreferrer" className="am-link text-xs font-medium text-ink">
              Faylni ochish
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function FieldView({ def, obj, onPatch, path, ctx }: { def: FieldDef; obj: Obj; onPatch: (p: Obj) => void; path: string; ctx: Ctx }) {
  const p = path + def.key
  const v = obj[def.key]
  switch (def.kind) {
    case 'lt':
      return <LtField label={def.label} hint={def.hint} multiline={def.multiline} rows={3} maxLength={def.max ?? 2000} locale={ctx.locale} value={v as LText} onChange={(nv) => onPatch({ [def.key]: nv })} error={ctx.errors[`${p}.${ctx.locale}`] ?? ctx.errors[p]} />
    case 'text':
      return (
        <Field label={def.label} hint={def.hint} error={ctx.errors[p]}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} type={def.type ?? 'text'} aria-describedby={describedBy} aria-invalid={invalid || undefined} placeholder={def.placeholder} maxLength={def.max} value={String(v ?? '')} onChange={(e) => onPatch({ [def.key]: e.target.value })} />
          )}
        </Field>
      )
    case 'number':
      return (
        <Field label={def.label} hint={def.hint} error={ctx.errors[p]}>
          {({ id, invalid }) => (
            <Input id={id} type="number" step={def.step} min={def.min} max={def.max} aria-invalid={invalid || undefined} className="tabular-nums" value={v === null || v === undefined ? '' : String(v)} onChange={(e) => onPatch({ [def.key]: e.target.value === '' ? null : e.target.value })} />
          )}
        </Field>
      )
    case 'select':
      return (
        <Field label={def.label} error={ctx.errors[p]}>
          {({ id }) => (
            <Select id={id} value={String(v ?? '')} onChange={(e) => onPatch({ [def.key]: e.target.value })}>
              {def.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )
    case 'media': {
      const mk = mediaKeyOf(def.key)
      return <MediaField def={def} value={(v as string | null) ?? null} media={(obj[mk] as Media | null) ?? null} onChange={(id, m) => onPatch({ [def.key]: id, [mk]: m })} />
    }
    case 'ltlist': {
      const items = (v as LText[]) ?? []
      return (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1.5 text-[13px] font-medium">{def.label}</legend>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-coral" />
                <Input aria-label={`${def.item} ${i + 1}`} placeholder={ctx.locale !== 'uz' ? lt(it, 'uz') : undefined} value={lt(it, ctx.locale)} onChange={(e) => onPatch({ [def.key]: items.map((x, j) => (j === i ? setLt(x, ctx.locale, e.target.value) : x)) })} />
                <button type="button" aria-label={`${def.item} ${i + 1}ni o‘chirish`} onClick={() => onPatch({ [def.key]: items.filter((_, j) => j !== i) })} className="am-btn-o flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control border border-line bg-white text-ink-2">
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ol>
          {items.length < def.max && (
            <button type="button" onClick={() => onPatch({ [def.key]: [...items, { uz: '', ru: '', en: '' }] })} className="am-btn-o mt-2 flex h-8 cursor-pointer items-center gap-1.5 rounded-control border border-line-strong bg-white px-3 text-[13px] font-medium">
              <PlusIcon size={12} />
              {def.item} qo‘shish
            </button>
          )}
        </fieldset>
      )
    }
    case 'list': {
      const items = (v as Obj[]) ?? []
      const setItems = (next: Obj[]) => onPatch({ [def.key]: next })
      return (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1 text-[13px] font-medium">{def.label}</legend>
          {def.hint && <p className="mt-0 mb-2 text-xs text-ink-2">{def.hint}</p>}
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {items.map((it, i) => (
              <li key={i} className="rounded-control border border-line bg-(--am-bg) p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[13px] font-semibold">
                    {def.item} {i + 1}
                  </span>
                  <div className="flex gap-1">
                    <button type="button" aria-label={`${def.item} ${i + 1}: yuqoriga`} disabled={i === 0} onClick={() => setItems(items.map((x, j) => (j === i - 1 ? items[i]! : j === i ? items[i - 1]! : x)))} className="am-btn-o flex size-8 cursor-pointer items-center justify-center rounded-control border border-line bg-white text-ink-2 disabled:opacity-40">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                        <path d="M2 7.5l4-4 4 4" />
                      </svg>
                    </button>
                    <button type="button" aria-label={`${def.item} ${i + 1}: pastga`} disabled={i === items.length - 1} onClick={() => setItems(items.map((x, j) => (j === i + 1 ? items[i]! : j === i ? items[i + 1]! : x)))} className="am-btn-o flex size-8 cursor-pointer items-center justify-center rounded-control border border-line bg-white text-ink-2 disabled:opacity-40">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                        <path d="M2 4.5l4 4 4-4" />
                      </svg>
                    </button>
                    <button type="button" aria-label={`${def.item} ${i + 1}ni o‘chirish`} onClick={() => setItems(items.filter((_, j) => j !== i))} className="am-btn-o flex size-8 cursor-pointer items-center justify-center rounded-control border border-line bg-white text-ink-2">
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                  {def.fields.map((f) => (
                    <div key={f.key} className={f.kind === 'lt' && f.multiline ? 'col-span-2 max-md:col-span-1' : ''}>
                      <FieldView def={f} obj={it} path={`${path}${def.key}.${i}.`} ctx={ctx} onPatch={(pp) => setItems(items.map((x, j) => (j === i ? { ...x, ...pp } : x)))} />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          {items.length < def.max && (
            <button type="button" onClick={() => setItems([...items, newItem(def.fields)])} className="am-btn-o mt-3 flex h-9 cursor-pointer items-center gap-2 rounded-control border border-line-strong bg-white px-3.5 text-sm font-medium">
              <PlusIcon size={12} />
              {def.item} qo‘shish
            </button>
          )}
        </fieldset>
      )
    }
  }
}

/** Sayt / bosh sahifa / klinika sozlamalari — sxema bo‘yicha forma, PUT to‘liq qiymat */
export function SettingsForm({ settingsKey, value }: { settingsKey: SettingsKey; value: SettingsValue }) {
  const qc = useQueryClient()
  const groups = settingsSchema[settingsKey]
  const locale = useAdminUi((s) => s.contentLocale)
  const setLocale = useAdminUi((s) => s.setContentLocale)
  const [baseline, setBaseline] = useState(() => normalize(value, groups))
  const [draft, setDraft] = useState<Obj>(baseline)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useSaveSettings(settingsKey)
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline])
  useUnsavedChangesGuard(dirty && !save.isPending)
  const fill = useMemo(() => localeFill(draft, groups), [draft, groups])
  const ctx: Ctx = { locale, errors }

  const onSave = () => {
    const errs = validate(draft, groups)
    setErrors(errs)
    if (Object.keys(errs).length) return toast.error('Ba’zi maydonlar noto‘g‘ri to‘ldirilgan')
    save.mutate(toPayload(draft, groups), {
      onSuccess: (data) => {
        const next = normalize(data, groups)
        setBaseline(next)
        setDraft(next)
        void qc.invalidateQueries({ queryKey: dashboardKeys.all })
        toast.success('Sozlamalar saqlandi — saytda yangilandi')
      },
      onError: (e) => {
        setErrors(fieldErrorsFrom(e))
        toast.error(errorMessage(e))
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-3">
        <span id="set-lang" className="text-xs font-medium text-ink-2">
          KONTENT TILI
        </span>
        <LocaleTabs labelId="set-lang" value={locale} onChange={setLocale} fill={fill} />
      </div>
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title} className="rounded-card border border-line bg-white p-6 max-md:p-4">
          <h2 className="m-0 mb-4 text-base font-semibold">{g.title}</h2>
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            {g.fields.map((f) => (
              <div key={f.key} className={f.kind === 'list' || f.kind === 'ltlist' || (f.kind === 'lt' && f.multiline) ? 'col-span-2 max-md:col-span-1' : ''}>
                <FieldView def={f} obj={draft} path="" ctx={ctx} onPatch={(p) => setDraft((d) => ({ ...d, ...p }))} />
              </div>
            ))}
          </div>
        </section>
      ))}
      <div role="status" className="sticky bottom-0 flex h-16 items-center gap-3 rounded-card border border-field bg-white px-5">
        <span aria-hidden className={`size-2 rounded-full ${dirty ? 'bg-(--am-warn-dot)' : 'bg-(--am-ok)'}`} />
        <span className="text-sm font-semibold">{save.isPending ? 'Saqlanmoqda…' : dirty ? 'Saqlanmagan o‘zgarishlar' : 'Barcha o‘zgarishlar saqlangan'}</span>
        <AdminButton className="ml-auto" disabled={!dirty || save.isPending} onClick={() => setDraft(baseline)}>
          Bekor qilish
        </AdminButton>
        <AdminButton variant="primary" className="px-5" disabled={!dirty || save.isPending} onClick={onSave}>
          Saqlash
        </AdminButton>
      </div>
    </div>
  )
}
