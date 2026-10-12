'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { audienceLabels, audienceLong, specialtiesQuery, useDeleteDoctor, useSaveDoctor, workDays, type Audience, type DoctorAdmin } from '@/entities/admin-doctor'
import { dashboardKeys } from '@/entities/lead'
import { MediaThumb } from '@/entities/media'
import { adminPaths, useAdminUi } from '@/entities/session'
import { groupDigits, parseDigits } from '@/shared/lib/admin/format'
import { errorMessage, fieldErrorsFrom, zodErrors } from '@/shared/lib/admin/form-errors'
import { ltOr } from '@/shared/lib/admin/ltext'
import { relativeDayTime } from '@/shared/lib/admin/time'
import { useNow } from '@/shared/lib/hooks/useNow'
import { useUnsavedChangesGuard } from '@/shared/lib/hooks/useUnsavedChangesGuard'
import { useUrlState } from '@/shared/lib/hooks/useUrlState'
import { slugify } from '@/shared/lib/slugify'
import { AdminButton } from '@/shared/ui/admin/Button'
import { ConfirmDialog } from '@/shared/ui/admin/ConfirmDialog'
import { Notice } from '@/shared/ui/admin/EmptyState'
import { AffixInput, Field, Input, Select } from '@/shared/ui/admin/Field'
import { Icon } from '@/shared/ui/admin/icons'
import { LocaleTabs } from '@/shared/ui/admin/LocaleTabs'
import { LtField } from '@/shared/ui/admin/LtField'
import { Segmented } from '@/shared/ui/admin/Segmented'
import { StatusTag } from '@/shared/ui/admin/StatusTag'
import { Switch } from '@/shared/ui/admin/Switch'
import { Tabs } from '@/shared/ui/admin/Tabs'
import { toast } from '@/shared/ui/admin/Toast'
import { SaveState, SiteLink, Topbar } from '@/shared/ui/admin/Topbar'

import { doctorSchema, localeFill, tabOfField, toDraft, toPayload, type DoctorDraft } from '../model/draft'

import { CertificatesEditor } from './CertificatesEditor'
import { PortraitCard } from './PortraitCard'
import { TimelineEditor } from './TimelineEditor'

type Tab = 'main' | 'edu' | 'cert' | 'seo'
const TAB_KEYS = ['tab'] as const

function savedLabel(at: string | null, now: number) {
  if (!at) return undefined
  const min = Math.floor((now - new Date(at).getTime()) / 60_000)
  if (min < 1) return 'Saqlandi · hozirgina'
  if (min < 60) return `Saqlandi · ${min} daqiqa oldin`
  return `Saqlandi · ${relativeDayTime(at, now)}`
}

/** A4: shifokor profili — tablar, kontent tili, portret, nashr sozlamalari */
export function DoctorForm({ doctor }: { doctor?: DoctorAdmin }) {
  const router = useRouter()
  const qc = useQueryClient()
  const locale = useAdminUi((s) => s.contentLocale)
  const setLocale = useAdminUi((s) => s.setContentLocale)
  const [{ tab: tabParam }, setUrl] = useUrlState(TAB_KEYS)
  const tab: Tab = (['main', 'edu', 'cert', 'seo'] as const).includes(tabParam as Tab) ? (tabParam as Tab) : 'main'

  const [baseline, setBaseline] = useState(() => toDraft(doctor))
  const [draft, setDraft] = useState<DoctorDraft>(baseline)
  const [slugTouched, setSlugTouched] = useState(Boolean(doctor))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [savedAt, setSavedAt] = useState<string | null>(doctor?.updated_at ?? null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const now = useNow(30_000)

  const specialties = useQuery(specialtiesQuery())
  const save = useSaveDoctor()
  const del = useDeleteDoctor()

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline])
  useUnsavedChangesGuard(dirty && !save.isPending)
  const fill = useMemo(() => localeFill(draft), [draft])

  const set = <K extends keyof DoctorDraft>(key: K, value: DoctorDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const specialty = specialties.data?.find((s) => s.id === draft.specialty_id)
  const name = draft.full_name.trim() || (doctor ? doctor.full_name : 'Yangi shifokor')

  const onSubmit = () => {
    const parsed = doctorSchema.safeParse(draft)
    if (!parsed.success) {
      const errs = zodErrors(parsed.error.issues)
      setErrors(errs)
      const first = Object.keys(errs)[0]
      if (first) setUrl({ tab: tabOfField(first) === 'main' ? null : tabOfField(first) })
      toast.error('Ba’zi maydonlar noto‘g‘ri to‘ldirilgan')
      return
    }
    setErrors({})
    save.mutate(
      { id: doctor?.id, body: toPayload(draft) },
      {
        onSuccess: (data) => {
          const next = toDraft(data)
          setBaseline(next)
          setDraft(next)
          setSavedAt(data.updated_at ?? new Date().toISOString())
          void qc.invalidateQueries({ queryKey: dashboardKeys.all })
          toast.success('Shifokor saqlandi')
          if (!doctor) router.replace(adminPaths.doctor(data.id))
        },
        onError: (e) => {
          const f = fieldErrorsFrom(e)
          if ((e as { detail?: string }).detail === 'slug_taken') f.slug = 'Bu slug band. Boshqasini kiriting.'
          setErrors(f)
          const first = Object.keys(f)[0]
          if (first && tabOfField(first) !== tab) setUrl({ tab: tabOfField(first) === 'main' ? null : tabOfField(first) })
          toast.error(errorMessage(e))
        },
      },
    )
  }

  const tabs = [
    { value: 'main' as Tab, label: 'Asosiy' },
    { value: 'edu' as Tab, label: 'Ta’lim va tajriba' },
    { value: 'cert' as Tab, label: 'Sertifikatlar' },
    { value: 'seo' as Tab, label: 'SEO' },
  ]

  return (
    <>
      <Topbar crumbs={[{ label: 'Shifokorlar', href: adminPaths.doctors }, { label: name }]}>
        <SaveState dirty={dirty} saving={save.isPending} savedText={doctor ? savedLabel(savedAt, now) : undefined} />
        {doctor?.is_published && <SiteLink href={`/uz/shifokorlar/${doctor.slug}`} />}
        <AdminButton variant="primary" className="px-5" onClick={onSubmit} disabled={save.isPending}>
          {save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
        </AdminButton>
      </Topbar>

      <main id="admin-main" className="flex min-h-0 flex-1 flex-col gap-4 px-8 pt-7 max-md:px-4 max-md:pt-4">
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="m-0 text-2xl leading-tight font-semibold tracking-[-0.02em]">{name}</h1>
            <div className="mt-2 flex gap-1.5">
              {specialty && <StatusTag tone="navy">{ltOr(specialty.title)}</StatusTag>}
              <StatusTag tone="navy">{audienceLong[draft.audience]}</StatusTag>
              {!draft.is_published && <StatusTag tone="warn">Saytda yashirin</StatusTag>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span id="lang-cap" className="text-xs font-medium text-ink-2">
              KONTENT TILI
            </span>
            <LocaleTabs labelId="lang-cap" value={locale} onChange={setLocale} fill={fill} />
          </div>
        </div>

        <Tabs label="Bo‘limlar" value={tab} onChange={(v) => setUrl({ tab: v === 'main' ? null : v })} tabs={tabs} panelId="doctor-panel" />

        <div id="doctor-panel" role="tabpanel" className="min-h-0 flex-1 overflow-auto pb-7">
          {tab === 'main' && (
            <div className="grid grid-cols-[minmax(0,620px)_300px] items-start gap-6 max-lg:grid-cols-1">
              <div className="flex flex-col gap-4">
                <section aria-label="Asosiy ma’lumotlar" className="flex flex-col gap-4 rounded-card border border-line bg-white p-6">
                  <Field label="F.I.O." error={errors.full_name} hint={locale !== 'uz' ? 'Ism barcha tillarda bir xil ko‘rsatiladi' : undefined}>
                    {({ id, describedBy, invalid }) => (
                      <Input
                        id={id}
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        maxLength={160}
                        value={draft.full_name}
                        onChange={(e) => {
                          const v = e.target.value
                          setDraft((d) => ({ ...d, full_name: v, slug: slugTouched ? d.slug : slugify(v).slice(0, 100) }))
                        }}
                      />
                    )}
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Mutaxassislik" error={errors.specialty_id}>
                      {({ id, invalid }) => (
                        <Select id={id} aria-invalid={invalid || undefined} value={draft.specialty_id || ''} onChange={(e) => set('specialty_id', Number(e.target.value))}>
                          <option value="" disabled>
                            {specialties.isPending ? 'Yuklanmoqda…' : 'Tanlang'}
                          </option>
                          {specialties.data?.map((s) => (
                            <option key={s.id} value={s.id}>
                              {ltOr(s.title, locale)}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                    <div>
                      <div id="aud-cap" className="mb-1.5 text-[13px] font-medium">
                        Kimlarni qabul qiladi
                      </div>
                      <Segmented<Audience>
                        label="Kimlarni qabul qiladi"
                        value={draft.audience}
                        onChange={(v) => set('audience', v)}
                        itemClassName="px-2 text-[13px]"
                        options={(['adults', 'children', 'all'] as const).map((a) => ({ value: a, label: audienceLabels[a] }))}
                      />
                    </div>
                  </div>

                  <LtField label="Qisqa tavsif" multiline rows={4} counter={280} maxLength={2000} locale={locale} value={draft.lead} onChange={(v) => set('lead', v)} error={errors[`lead.${locale}`]} inputClassName="h-24" />

                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] gap-4">
                    <Field label="Tajriba (yil)" error={errors.experience_years}>
                      {({ id, invalid }) => (
                        <Input
                          id={id}
                          inputMode="numeric"
                          aria-invalid={invalid || undefined}
                          className="tabular-nums"
                          value={draft.experience_years ?? ''}
                          onChange={(e) => set('experience_years', parseDigits(e.target.value, 2))}
                        />
                      )}
                    </Field>
                    <LtField label="Toifa" list="qual-options" locale={locale} value={draft.qualification} onChange={(v) => set('qualification', v)} maxLength={200} />
                    <datalist id="qual-options">
                      <option value="Oliy toifa" />
                      <option value="Birinchi toifa" />
                      <option value="Ikkinchi toifa" />
                    </datalist>
                    <Field label="Qabul narxi" error={errors.price}>
                      {({ id, invalid }) => (
                        <AffixInput
                          id={id}
                          invalid={invalid}
                          inputMode="numeric"
                          placeholder="Narx yo‘q"
                          suffix="so‘m"
                          inputClassName="text-right tabular-nums"
                          value={groupDigits(draft.price)}
                          onChange={(e) => set('price', parseDigits(e.target.value, 10))}
                        />
                      )}
                    </Field>
                  </div>

                  <LtField label="Qabul tillari" locale={locale} value={draft.languages} onChange={(v) => set('languages', v)} hint="Tillarni vergul bilan ajrating" maxLength={300} />

                  <div>
                    <div id="days-cap" className="mb-1.5 text-[13px] font-medium">
                      Qabul kunlari
                    </div>
                    <div role="group" aria-labelledby="days-cap" className="flex flex-wrap gap-2">
                      {workDays.map((d) => {
                        const on = draft.work_days.includes(d.value)
                        return (
                          <button
                            key={d.value}
                            type="button"
                            aria-pressed={on}
                            aria-label={d.full}
                            onClick={() => set('work_days', on ? draft.work_days.filter((x) => x !== d.value) : workDays.map((w) => w.value).filter((v) => v === d.value || draft.work_days.includes(v)))}
                            className={`h-10 w-[52px] cursor-pointer rounded-control border text-sm font-medium ${on ? 'border-navy bg-navy text-white' : 'am-btn-o border-line-strong bg-white text-ink'}`}
                          >
                            {d.short}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </section>

                {doctor && (
                  <div>
                    <button type="button" onClick={() => setConfirmDelete(true)} className="am-del flex h-10 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-sm font-medium text-ink-2">
                      <Icon name="trash" size={16} />
                      Shifokorni o‘chirish
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <PortraitCard photo={draft.photo} name={draft.full_name} onChange={(m) => setDraft((d) => ({ ...d, photo: m, photo_id: m?.id ?? null }))} />

                <section aria-labelledby="pub-title" className="flex flex-col gap-3 rounded-card border border-line bg-white p-4">
                  <h2 id="pub-title" className="m-0 text-base font-semibold">
                    Nashr
                  </h2>
                  <Field label="URL slug" error={errors.slug}>
                    {({ id, describedBy, invalid }) => (
                      <AffixInput
                        id={id}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        prefix="/shifokorlar/"
                        maxLength={100}
                        value={draft.slug}
                        onChange={(e) => {
                          setSlugTouched(true)
                          set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                        }}
                      />
                    )}
                  </Field>
                  <Field label="Tartib raqami" error={errors.order}>
                    {({ id, invalid }) => (
                      <Input id={id} inputMode="numeric" aria-invalid={invalid || undefined} className="w-24! tabular-nums" value={draft.order} onChange={(e) => set('order', parseDigits(e.target.value, 6) ?? 0)} />
                    )}
                  </Field>
                  <div className="flex flex-col gap-3 border-t border-line pt-3">
                    <Switch size="sm" label="Bosh sahifada ko‘rsatish" checked={draft.show_on_home} onChange={(v) => set('show_on_home', v)} />
                    <Switch size="sm" label="Saytda e’lon qilingan" checked={draft.is_published} onChange={(v) => set('is_published', v)} />
                  </div>
                </section>

                <section aria-labelledby="pv-title" className="rounded-card border border-line bg-white p-4">
                  <h2 id="pv-title" className="m-0 mb-3 text-base font-semibold">
                    Saytda qanday ko‘rinadi
                  </h2>
                  <div className="flex gap-3 rounded-card border border-line bg-white p-2.5">
                    <MediaThumb media={draft.photo} width={72} height={96} />
                    <div className="flex min-w-0 flex-col justify-end">
                      <div className="text-[15px] leading-tight font-semibold">{name}</div>
                      <div className="mt-1 text-[13px] text-ink-2">
                        {specialty ? ltOr(specialty.title, locale) : '[Mutaxassislik]'} · {draft.experience_years !== null ? `${draft.experience_years} yil tajriba` : '[N] yil'}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {tab === 'edu' && (
            <div className="flex flex-col gap-4">
              <TimelineEditor title="Ta’lim" description="Qatorlar saytda shu tartibda ko‘rsatiladi. Tartibni o‘zgartirish uchun sudrang." rows={draft.education} onChange={(v) => set('education', v)} locale={locale} />
              <TimelineEditor title="Ish tajribasi" rows={draft.career} onChange={(v) => set('career', v)} locale={locale} detailLabel="Lavozim" />
            </div>
          )}

          {tab === 'cert' && <CertificatesEditor items={draft.certificates} onChange={(v) => set('certificates', v)} locale={locale} />}

          {tab === 'seo' && (
            <section aria-labelledby="seo-title" className="flex w-full max-w-[620px] flex-col gap-4 rounded-card border border-line bg-white p-6">
              <h2 id="seo-title" className="m-0 text-base font-semibold">
                SEO
              </h2>
              <LtField label="Sarlavha (title)" counter={60} maxLength={70} locale={locale} value={draft.seo.title} onChange={(v) => set('seo', { ...draft.seo, title: v })} error={errors[`seo.title.${locale}`]} placeholder={`${name} — NeyroHelp`} />
              <LtField label="Tavsif (description)" multiline rows={3} counter={160} maxLength={200} locale={locale} value={draft.seo.description} onChange={(v) => set('seo', { ...draft.seo, description: v })} error={errors[`seo.description.${locale}`]} />
              <Notice tone="info">Bo‘sh qoldirilsa, sarlavha va tavsif profil ma’lumotlaridan avtomatik tuziladi.</Notice>
            </section>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={confirmDelete}
        destructive
        title="Shifokorni o‘chirasizmi?"
        confirmLabel="O‘chirish"
        pending={del.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          doctor &&
          del.mutate(doctor.id, {
            onSuccess: () => {
              setBaseline(draft)
              toast.success('Shifokor o‘chirildi')
              router.replace(adminPaths.doctors)
            },
            onError: (e) => {
              setConfirmDelete(false)
              toast.error(errorMessage(e))
            },
          })
        }
      >
        «{name}» profili saytdan butunlay o‘chiriladi. Vaqtincha yashirish uchun «Saytda e’lon qilingan» kalitini o‘chiring.
      </ConfirmDialog>
    </>
  )
}
