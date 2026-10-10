'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { homePathFor, sessionKeys, totpEnable, totpSetup, type Me } from '@/entities/session'
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

/**
 * 2FA (TOTP) sozlash: QR kutubxonasi yo‘q — kalit va otpauth URI matn ko‘rinishida,
 * «Authenticator ilovasiga qo‘lda kiriting». Kalit faqat shu komponent holatida (persist qilinmaydi).
 */
export function TwoFactorCard({ me }: { me: Me }) {
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
      toast.success('Ikki bosqichli himoya yoqildi')
      if (me.totp_required) router.replace(homePathFor(data.role))
    },
    onError: (e) => {
      setCode('')
      setError(errorMessage(e, 'Kod noto‘g‘ri'))
    },
  })

  if (me.totp_enabled) {
    return (
      <Card aria-labelledby="tfa-title" className="p-6">
        <div className="flex items-center justify-between">
          <h2 id="tfa-title" className="m-0 text-base font-semibold">
            Ikki bosqichli himoya (2FA)
          </h2>
          <StatusTag tone="ok" dot>
            Yoqilgan
          </StatusTag>
        </div>
        <p className="mt-2 mb-0 text-[13px] text-ink-2">Kirishda parol bilan birga Authenticator ilovasidagi 6 xonali kod so‘raladi. Telefoningizni almashtirsangiz, administratorga murojaat qiling.</p>
      </Card>
    )
  }

  const secret = setup.data?.secret
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) return setError('6 xonali kodni kiriting')
    setError('')
    enable.mutate()
  }

  return (
    <Card aria-labelledby="tfa-title" className="p-6">
      <div className="flex items-center justify-between">
        <h2 id="tfa-title" className="m-0 text-base font-semibold">
          Ikki bosqichli himoya (2FA)
        </h2>
        <StatusTag tone="warn">O‘rnatilmagan</StatusTag>
      </div>
      <p className="mt-2 mb-0 text-[13px] text-ink-2">Administrator va muharrir uchun majburiy. Google Authenticator, Microsoft Authenticator yoki boshqa TOTP ilovasidan foydalaning.</p>

      {!secret ? (
        <AdminButton variant="primary" className="mt-4" onClick={() => setup.mutate()} disabled={setup.isPending}>
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
    </Card>
  )
}
