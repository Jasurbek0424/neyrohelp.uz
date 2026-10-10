'use client'

import { useState } from 'react'

import { generatePassword } from '@/shared/lib/admin/password'

import { AdminButton } from './Button'
import { Field, Input } from './Field'
import { toast } from './Toast'

/** Xodimga beriladigan parol: ko‘rinadigan matn, «Yaratish» va «Nusxalash» */
export function PasswordField({ label, value, onChange, error, hint }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Field label={label} error={error} hint={hint ?? 'Kamida 12 belgi: kichik va katta harf, raqam, belgidan kamida 3 turi.'}>
      {({ id, describedBy, invalid }) => (
        <div className="flex items-center gap-2">
          <Input
            id={id}
            type="text"
            autoComplete="new-password"
            spellCheck={false}
            className="font-mono"
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <AdminButton size="sm" onClick={() => onChange(generatePassword())}>
            Yaratish
          </AdminButton>
          <AdminButton
            size="sm"
            disabled={!value}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              } catch {
                toast.error('Nusxalab bo‘lmadi — qo‘lda belgilang')
              }
            }}
          >
            {copied ? 'Nusxalandi' : 'Nusxalash'}
          </AdminButton>
        </div>
      )}
    </Field>
  )
}
