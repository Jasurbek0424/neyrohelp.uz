'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { maskLocalPart } from '@/shared/lib/phone'
import { Check } from '@/shared/ui/Icons'

import { submitLead } from '../api/submitLead'
import type { FieldErrors, LeadField } from '../model/types'
import { validateLead } from '../model/validate'

type Props = {
  locale: Locale
  t: Dictionary['lead']
  privacyLabel: string
  privacyHref: string
  responseTime: string
}

const field =
  'h-13 w-full rounded-control border border-field bg-white px-4 text-base text-ink placeholder:text-ink-2/70 ' +
  'transition-colors focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy ' +
  'aria-invalid:border-danger'

const INPUT_ID: Record<LeadField, string> = { full_name: 'lf-name', phone: 'lf-phone', consent: 'lf-consent' }

/** Tashqi o‘ram: «Yana ariza» bosilganda ichki forma key bilan qayta yaratiladi — holat to‘liq tozalanadi */
export function LeadForm(props: Props) {
  const [round, setRound] = useState(0)
  return <LeadFormInner key={round} {...props} onReset={() => setRound((r) => r + 1)} />
}

type Status = 'idle' | 'sending' | 'success'

function LeadFormInner({ locale, t, privacyLabel, privacyHref, responseTime, onReset }: Props & { onReset: () => void }) {
  const pathname = usePathname()
  const [status, setStatus] = useState<Status>('idle')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const mountedAt = useRef(0)
  const formRef = useRef<HTMLFormElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  // Forma ko‘rsatilgan vaqt — botlarni ajratish uchun (elapsed_ms)
  useEffect(() => {
    mountedAt.current = Date.now()
  }, [])
  useEffect(() => {
    if (status === 'success') successRef.current?.focus()
  }, [status])

  const messages: Record<LeadField, string> = { full_name: t.errors.name, phone: t.errors.phone, consent: t.errors.consent }

  function showFieldErrors(fields: LeadField[]) {
    setErrors(Object.fromEntries(fields.map((f) => [f, messages[f]])))
    const first = fields[0]
    if (first) formRef.current?.querySelector<HTMLElement>(`#${INPUT_ID[first]}`)?.focus()
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'sending') return
    const data = new FormData(e.currentTarget)
    const values = {
      full_name: String(data.get('full_name') ?? '').trim(),
      phone: phone.replace(/\D/g, ''),
      consent: data.get('consent') === 'on',
    }
    setFormError(null)
    const invalid = validateLead(values)
    if (invalid.length) return showFieldErrors(invalid)
    setErrors({})
    setStatus('sending')

    const message = String(data.get('message') ?? '').trim()
    const result = await submitLead({
      full_name: values.full_name,
      phone: values.phone,
      message: message || null,
      consent: true,
      page: pathname,
      locale,
      website: String(data.get('website') ?? ''),
      elapsed_ms: mountedAt.current ? Date.now() - mountedAt.current : null,
    })

    if (result.ok) return setStatus('success')
    setStatus('idle')
    if (result.kind === 'validation') return showFieldErrors(result.fields)
    setFormError(result.kind === 'rate-limit' ? t.errors.tooMany : t.errors.generic)
  }

  if (status === 'success') {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="flex min-h-[26rem] flex-col justify-center gap-4 outline-none">
        <div className="flex size-14 items-center justify-center rounded-control bg-navy-soft text-navy">
          <Check size={26} />
        </div>
        <p className="text-[28px] font-semibold tracking-tight">{t.successTitle}</p>
        <p className="max-w-md text-[17px] leading-relaxed text-ink-2">{t.successText.replace('{time}', responseTime)}</p>
        <button
          type="button"
          onClick={onReset}
          className="mt-2 h-12 self-start rounded-control border border-ink px-5 text-[15px] font-medium transition-colors hover:bg-ink hover:text-white"
        >
          {t.again}
        </button>
      </div>
    )
  }

  const sending = status === 'sending'

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-5" aria-busy={sending}>
      <p className="text-2xl font-semibold tracking-tight">{t.formTitle}</p>

      {/* Botlar uchun tuzoq — odam ko‘rmaydi, Tab bilan ham o‘tilmaydi */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="lf-name" className="text-sm font-medium">
            {t.name}
          </label>
          <input
            id="lf-name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            placeholder={t.namePlaceholder}
            aria-invalid={Boolean(errors.full_name)}
            aria-describedby={errors.full_name ? 'lf-name-err' : undefined}
            onChange={() => errors.full_name && setErrors((e) => ({ ...e, full_name: undefined }))}
            className={field}
          />
          {errors.full_name ? (
            <p id="lf-name-err" className="text-[13px] text-danger">
              {errors.full_name}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="lf-phone" className="text-sm font-medium">
            {t.phone}
          </label>
          <div className="flex gap-2">
            <span aria-hidden className="flex h-13 items-center rounded-control border border-field bg-sand px-3.5 text-base tabular-nums">
              +998
            </span>
            <input
              id="lf-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              required
              value={phone}
              onChange={(e) => {
                setPhone(maskLocalPart(e.target.value.replace(/^\+?998\s?/, '')))
                if (errors.phone) setErrors((er) => ({ ...er, phone: undefined }))
              }}
              placeholder={t.phonePlaceholder}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'lf-phone-err' : undefined}
              className={`${field} min-w-0 tabular-nums`}
            />
          </div>
          {errors.phone ? (
            <p id="lf-phone-err" className="text-[13px] text-danger">
              {errors.phone}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="lf-msg" className="text-sm font-medium">
          {t.message}
        </label>
        <textarea
          id="lf-msg"
          name="message"
          rows={4}
          maxLength={2000}
          placeholder={t.messagePlaceholder}
          className={`${field} h-30 resize-none py-3.5`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-normal text-ink-2">
          <input
            id="lf-consent"
            type="checkbox"
            name="consent"
            required
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? 'lf-consent-err' : undefined}
            onChange={() => errors.consent && setErrors((e) => ({ ...e, consent: undefined }))}
            className="mt-0.5 size-4.5 shrink-0 accent-navy"
          />
          <span>
            {t.consent}{' '}
            <a href={privacyHref} className="link-underline text-ink">
              {privacyLabel}
            </a>
          </span>
        </label>
        {errors.consent ? (
          <p id="lf-consent-err" className="text-[13px] text-danger">
            {errors.consent}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="rounded-control bg-coral-soft px-4 py-3 text-sm text-coral-ink">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[13px] text-ink-2">{t.privacyNote}</span>
        <button
          type="submit"
          disabled={sending}
          className="h-13 shrink-0 rounded-control bg-navy px-7 font-medium text-white transition-colors hover:bg-navy-deep disabled:cursor-wait disabled:bg-field"
        >
          {sending ? t.sending : t.submit}
        </button>
      </div>
    </form>
  )
}
