'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'

import { clearClientState, homePathFor, login, postAuthMessage, safeNext, sessionKeys, adminPaths, type LoginBody } from '@/entities/session'
import { errorMessage, zodErrors } from '@/shared/lib/admin/form-errors'
import { inputClass } from '@/shared/ui/admin/Field'
import { Icon } from '@/shared/ui/admin/icons'

import { credentialsSchema, totpSchema } from '../model/schema'

type Step = 'credentials' | 'totp'

const label = 'mb-1.5 block text-[13px] font-medium'

function ErrorLine({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger">
      <Icon name="alert" size={14} strokeWidth={1.8} />
      {children}
    </p>
  )
}

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [forgot, setForgot] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)

  const m = useMutation({
    mutationFn: (body: LoginBody) => login(body),
    onSuccess: (res) => {
      if (res.requires_totp) {
        setStep('totp')
        setFormError('')
        requestAnimationFrame(() => codeRef.current?.focus())
        return
      }
      if (!res.user) return setFormError('Kirishda xatolik. Qayta urinib ko‘ring.')
      // oldingi foydalanuvchidan qolgan kesh va UI holati bo‘lmasin
      clearClientState(qc)
      qc.setQueryData(sessionKeys.me(), res.user)
      postAuthMessage({ type: 'login' })
      setPassword('')
      const target = res.user.totp_required ? `${adminPaths.profile}?setup=2fa` : (safeNext(params.get('next')) ?? homePathFor(res.user.role))
      router.replace(target)
    },
    onError: (err) => {
      setFormError(errorMessage(err))
      if (step === 'totp') setCode('')
    },
  })

  const submitCredentials = (e: FormEvent) => {
    e.preventDefault()
    const parsed = credentialsSchema.safeParse({ email, password })
    if (!parsed.success) return setErrors(zodErrors(parsed.error.issues))
    setErrors({})
    setFormError('')
    m.mutate(parsed.data)
  }

  const submitTotp = (e: FormEvent) => {
    e.preventDefault()
    const parsed = totpSchema.safeParse(code.trim())
    if (!parsed.success) return setErrors({ totp: parsed.error.issues[0]?.message ?? '' })
    setErrors({})
    setFormError('')
    m.mutate({ email: email.trim(), password, totp: parsed.data })
  }

  if (step === 'totp') {
    return (
      <form onSubmit={submitTotp} noValidate className="mt-8 flex flex-col gap-5">
        <div>
          <label htmlFor="lg-totp" className={label}>
            Tasdiqlash kodi
          </label>
          <input
            ref={codeRef}
            id="lg-totp"
            className={`${inputClass} text-center text-lg tracking-[0.4em] tabular-nums`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-invalid={Boolean(errors.totp || formError) || undefined}
            aria-describedby="lg-totp-help"
          />
          {errors.totp ? (
            <ErrorLine id="lg-totp-err">{errors.totp}</ErrorLine>
          ) : formError ? (
            <ErrorLine id="lg-form-err">{formError}</ErrorLine>
          ) : (
            <p id="lg-totp-help" className="mt-1.5 text-xs text-ink-2">
              Authenticator ilovasidagi 6 xonali kodni kiriting.
            </p>
          )}
        </div>
        <div>
          <button type="submit" disabled={m.isPending} className="am-btn h-11 w-full cursor-pointer rounded-control border-0 bg-navy text-[15px] font-medium text-white disabled:opacity-60">
            {m.isPending ? 'Tekshirilmoqda…' : 'Tasdiqlash'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('credentials')
              setCode('')
              setPassword('')
              setFormError('')
            }}
            className="am-link mt-3 cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium text-ink"
          >
            Boshqa hisob bilan kirish
          </button>
        </div>
      </form>
    )
  }

  const pwInvalid = Boolean(errors.password || formError)
  return (
    <form onSubmit={submitCredentials} noValidate className="mt-8 flex flex-col gap-5">
      <div>
        <label htmlFor="lg-email" className={label}>
          Email
        </label>
        <input
          id="lg-email"
          type="email"
          autoComplete="username"
          placeholder="nom@neyromed.uz"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? 'lg-email-err' : undefined}
          autoFocus
        />
        {errors.email && <ErrorLine id="lg-email-err">{errors.email}</ErrorLine>}
      </div>

      <div>
        <label htmlFor="lg-pass" className={label}>
          Parol
        </label>
        <div className="relative">
          <input
            id="lg-pass"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            className={`${inputClass} pr-11`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={pwInvalid || undefined}
            aria-describedby={pwInvalid ? 'lg-pass-err' : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
            aria-pressed={showPw}
            className="am-btn-o absolute top-1 right-1 flex size-8 cursor-pointer items-center justify-center rounded-control border-0 bg-transparent text-ink-2"
          >
            <Icon name={showPw ? 'eyeOff' : 'eye'} />
          </button>
        </div>
        {(errors.password || formError) && <ErrorLine id="lg-pass-err">{errors.password || formError}</ErrorLine>}
      </div>

      <div className="flex items-center justify-end">
        <button type="button" aria-expanded={forgot} aria-controls="lg-forgot" onClick={() => setForgot((v) => !v)} className="am-link cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium text-ink">
          Parolni unutdingizmi?
        </button>
      </div>
      {forgot && (
        <p id="lg-forgot" className="-mt-2 rounded-control bg-sand px-3.5 py-2.5 text-[13px] leading-normal text-ink-2">
          Parolni tiklash uchun klinika administratoriga murojaat qiling — u yangi vaqtinchalik parol beradi.
        </p>
      )}

      <div>
        <button type="submit" disabled={m.isPending} className="am-btn h-11 w-full cursor-pointer rounded-control border-0 bg-navy text-[15px] font-medium text-white disabled:opacity-60">
          {m.isPending ? 'Kirilmoqda…' : 'Kirish'}
        </button>
        <p className="mt-3 text-xs leading-normal text-ink-2">5 marta noto‘g‘ri urinishdan keyin hisob 15 daqiqaga bloklanadi</p>
      </div>
    </form>
  )
}
