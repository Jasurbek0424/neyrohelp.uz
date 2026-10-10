'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { homePathFor, sessionKeys, telegramConfirm, telegramLink, totpEnable, totpSetup, type Me } from '@/entities/session'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { AdminButton } from '@/shared/ui/admin/Button'
import { Card } from '@/shared/ui/admin/Table'
import { inputClass } from '@/shared/ui/admin/Field'
import { StatusTag } from '@/shared/ui/admin/StatusTag'
import { toast } from '@/shared/ui/admin/Toast'

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <AdminButton
      size="sm"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 2000)
        } catch {
          toast.error('Nusxalab bo‘lmadi — qo‘lda belgilang')
        }
      }}
    >
      {done ? 'Nusxalandi' : 'Nusxalash'}
    </AdminButton>
  )
}


function CodeInput({ id, value, onChange, error }: { id: string; value: string; onChange: (v: string) => void; error: string }) {
  return (
    <div>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`${inputClass} w-40 text-center tracking-[0.3em] tabular-nums`}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/** Telegram orqali 2FA: ID kiritiladi → bot tasdiqlash kodini yuboradi → kod kiritiladi. */
function TelegramSetup({ me, onDone }: { me: Me; onDone?: () => void }) {
  const qc = useQueryClient()
  const router = useRouter()
  const [tid, setTid] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const link = useMutation({
    mutationFn: () => telegramLink(Number(tid)),
    onSuccess: () => {
      setError('')
      setCode('')
    },
    onError: (e) => setError(errorMessage(e)),
  })
  const confirm = useMutation({
    mutationFn: () => telegramConfirm(code),
    onSuccess: (data) => {
      qc.setQueryData(sessionKeys.me(), data)
      toast.success('Telegram ulandi — ikki bosqichli himoya yoqildi')
      onDone?.()
      if (me.totp_required) router.replace(homePathFor(data.role))
    },
    onError: (e) => {
      setCode('')
      setError(errorMessage(e, 'Kod noto‘g‘ri'))
    },
  })

  const sendCode = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d{3,13}$/.test(tid)) return setError('Telegram ID faqat raqamlardan iborat')
    link.mutate()
  }
  const submitCode = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) return setError('6 xonali kodni kiriting')
    setError('')
    confirm.mutate()
  }

  const step = 'mb-2 text-sm font-semibold'
  const hint = 'mt-1 mb-2 text-[13px] text-ink-2'
  return (
    <ol className="mt-5 mb-0 flex list-none flex-col gap-5 p-0">
      <li>
        <div className={step}>1. Botda /start bosing</div>
        <p className={hint}>Kodlar klinika botidan keladi. Telegram’da botni oching va bir marta «Start» ni bosing — aks holda bot sizga yozolmaydi.</p>
      </li>
      <li>
        <form onSubmit={sendCode} noValidate>
          <label htmlFor="tg-id" className={step}>
            2. Telegram ID’ingizni kiriting
          </label>
          <p className={hint}>
            ID’ni bilish uchun Telegram’da <b>@userinfobot</b> ga istalgan xabar yozing — u raqamingizni yuboradi (masalan 123456789).
          </p>
          <div className="flex items-start gap-2">
            <input
              id="tg-id"
              inputMode="numeric"
              placeholder="123456789"
              className={`${inputClass} w-48 tabular-nums`}
              value={tid}
              onChange={(e) => setTid(e.target.value.replace(/\D/g, '').slice(0, 13))}
              disabled={link.isSuccess}
            />
            <AdminButton type="submit" variant={link.isSuccess ? 'secondary' : 'primary'} disabled={link.isPending}>
              {link.isPending ? 'Yuborilmoqda…' : link.isSuccess ? 'Qayta yuborish' : 'Kod yuborish'}
            </AdminButton>
          </div>
          {!link.isSuccess && error && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
              {error}
            </p>
          )}
        </form>
      </li>
      {link.isSuccess && (
        <li>
          <form onSubmit={submitCode} noValidate>
            <label htmlFor="tg-code" className={step}>
              3. Telegram’ga kelgan kodni kiriting
            </label>
            <div className="mt-2 flex items-start gap-2">
              <CodeInput id="tg-code" value={code} onChange={setCode} error={error} />
              <AdminButton type="submit" variant="primary" disabled={confirm.isPending}>
                {confirm.isPending ? 'Tekshirilmoqda…' : 'Ulash'}
              </AdminButton>
            </div>
          </form>
        </li>
      )}
    </ol>
  )
}

export function TwoFactorCard({ me }: { me: Me }) {
  const [relink, setRelink] = useState(false)
  const enabled = me.telegram_2fa || me.totp_enabled

  return (
    <Card aria-labelledby="tfa-title" className="p-6">
      <div className="flex items-center justify-between">
        <h2 id="tfa-title" className="m-0 text-base font-semibold">
          Ikki bosqichli himoya (2FA)
        </h2>
        {enabled ? (
          <StatusTag tone="ok" dot>
            Yoqilgan
          </StatusTag>
        ) : (
          <StatusTag tone="warn">O‘rnatilmagan</StatusTag>
        )}
      </div>

      {enabled ? (
        <>
          <p className="mt-2 mb-0 text-[13px] text-ink-2">
            Kirishda parol bilan birga {me.telegram_2fa ? 'Telegram’ga keladigan' : 'Authenticator ilovasidagi'} 6 xonali kod so‘raladi. «Bu qurilmani eslab qolish» belgilansa, shu brauzerda 30 kun so‘ralmaydi.
          </p>
          <dl className="mt-4 mb-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13px]">
            <dt className="text-ink-2">Telegram</dt>
            <dd className="m-0">{me.telegram_2fa ? `Ulangan · ID ${me.telegram_hint ?? ''}` : 'Ulanmagan'}</dd>
            <dt className="text-ink-2">Authenticator ilovasi</dt>
            <dd className="m-0">{me.totp_enabled ? 'Ulangan' : 'Ulanmagan'}</dd>
          </dl>
          {!relink ? (
            <AdminButton size="sm" className="mt-4" onClick={() => setRelink(true)}>
              {me.telegram_2fa ? 'Telegram’ni almashtirish' : 'Telegram’ni ulash'}
            </AdminButton>
          ) : (
            <TelegramSetup me={me} onDone={() => setRelink(false)} />
          )}
        </>
      ) : (
        <>
          <p className="mt-2 mb-0 text-[13px] text-ink-2">Administrator va muharrir uchun majburiy. Kirish kodi Telegram’ga keladi — hech qanday ilova o‘rnatish shart emas.</p>
          <TelegramSetup me={me} />
          <details className="mt-6 border-t border-line pt-4">
            <summary className="cursor-pointer text-[13px] font-medium text-ink-2">Telegram o‘rniga Authenticator ilovasi orqali</summary>
            <AppSetup me={me} />
          </details>
        </>
      )}
    </Card>
  )
}

function AppSetup({ me }: { me: Me }) {
  const qc = useQueryClient()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const setup = useMutation({ mutationFn: totpSetup, onError: (e) => toast.error(errorMessage(e)) })
  const enable = useMutation({
    mutationFn: () => totpEnable(code),
    onSuccess: (data) => {
      qc.setQueryData(sessionKeys.me(), data)
      setup.reset()
      toast.success('Authenticator ilovasi ulandi')
      if (me.totp_required) router.replace(homePathFor(data.role))
    },
    onError: (e) => {
      setCode('')
      setError(errorMessage(e, 'Kod noto‘g‘ri'))
    },
  })

  const secret = setup.data?.secret
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) return setError('6 xonali kodni kiriting')
    setError('')
    enable.mutate()
  }

  return (
    <div className="mt-3">
      {!secret ? (
        <AdminButton className="mt-1" onClick={() => setup.mutate()} disabled={setup.isPending}>
          {setup.isPending ? 'Tayyorlanmoqda…' : 'Sozlashni boshlash'}
        </AdminButton>
      ) : (
        <ol className="mt-5 mb-0 flex list-none flex-col gap-5 p-0">
          <li>
            <div className="text-sm font-semibold">1. Kalitni Authenticator ilovasiga qo‘lda kiriting</div>
            <p className="mt-1 mb-2 text-[13px] text-ink-2">Ilovada «Kalitni kiritish» / «Enter a setup key» ni tanlang. Hisob nomi: {me.email}, turi: vaqtga asoslangan.</p>
            <div className="flex items-center gap-2">
              <code aria-label="Maxfiy kalit" className="rounded-control border border-line bg-(--am-bg) px-3 py-2 font-mono text-[15px] tracking-[0.12em] break-all select-all">
                {secret.replace(/(.{4})/g, '$1 ').trim()}
              </code>
              <CopyButton text={secret} label="Kalitni nusxalash" />
            </div>
          </li>
          <li>
            <div className="text-sm font-semibold">Yoki otpauth havolasi</div>
            <p className="mt-1 mb-2 text-[13px] text-ink-2">Ba’zi ilovalar (masalan, parol menejerlari) shu havolani to‘g‘ridan-to‘g‘ri qabul qiladi.</p>
            <div className="flex items-start gap-2">
              <label htmlFor="otpauth" className="sr-only">
                otpauth URI
              </label>
              <textarea id="otpauth" readOnly rows={2} className={`${inputClass} h-auto resize-none py-2 font-mono text-xs break-all`} value={setup.data!.otpauth_uri} onFocus={(e) => e.currentTarget.select()} />
              <CopyButton text={setup.data!.otpauth_uri} label="Havolani nusxalash" />
            </div>
          </li>
          <li>
            <form onSubmit={submit} noValidate>
              <label htmlFor="tfa-code" className="text-sm font-semibold">
                2. Ilovadagi 6 xonali kodni kiriting
              </label>
              <div className="mt-2 flex items-start gap-2">
                <div>
                  <input
                    id="tfa-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby={error ? 'tfa-err' : undefined}
                    className={`${inputClass} w-40 text-center tracking-[0.3em] tabular-nums`}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  {error && (
                    <p id="tfa-err" role="alert" className="mt-1.5 text-xs font-medium text-danger">
                      {error}
                    </p>
                  )}
                </div>
                <AdminButton type="submit" variant="primary" disabled={enable.isPending}>
                  {enable.isPending ? 'Tekshirilmoqda…' : 'Yoqish'}
                </AdminButton>
              </div>
            </form>
          </li>
        </ol>
      )}
    </div>
  )
}
