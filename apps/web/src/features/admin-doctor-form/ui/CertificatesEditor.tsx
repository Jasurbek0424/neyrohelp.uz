'use client'

import { useState } from 'react'

import { MediaThumb, useUploadMedia, validateUpload } from '@/entities/media'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { lt, setLt, type ContentLocale } from '@/shared/lib/admin/ltext'
import { inputClass } from '@/shared/ui/admin/Field'
import { FileDrop } from '@/shared/ui/admin/FileDrop'
import { Icon, PlusIcon } from '@/shared/ui/admin/icons'
import { StatusTag } from '@/shared/ui/admin/StatusTag'
import { toast } from '@/shared/ui/admin/Toast'

import type { DoctorDraft } from '../model/draft'

type Cert = DoctorDraft['certificates'][number]

export function CertificatesEditor({ items, onChange, locale }: { items: Cert[]; onChange: (v: Cert[]) => void; locale: ContentLocale }) {
  const upload = useUploadMedia()
  const [busyIndex, setBusyIndex] = useState<number | null>(null)
  const patch = (i: number, p: Partial<Cert>) => onChange(items.map((c, j) => (j === i ? { ...c, ...p } : c)))

  const onFile = (i: number, file: File) => {
    const err = validateUpload(file, 'image')
    if (err) return toast.error(err)
    setBusyIndex(i)
    upload.mutate(
      { file, alt: lt(items[i]?.title, 'uz') },
      {
        onSuccess: (m) => patch(i, { image_id: m.id, image: m }),
        onError: (e) => toast.error(errorMessage(e, 'Faylni yuklab bo‘lmadi')),
        onSettled: () => setBusyIndex(null),
      },
    )
  }

  return (
    <section aria-labelledby="cert-title" className="w-full max-w-[920px] rounded-card border border-line bg-white p-6">
      <h2 id="cert-title" className="m-0 text-base font-semibold">
        Sertifikatlar
      </h2>
      <ul className="m-0 mt-4 list-none border-t border-line p-0">
        {items.map((c, i) => (
          <li key={i} className="grid grid-cols-[64px_minmax(0,1fr)_96px_auto_36px] items-center gap-3 border-b border-line py-3.5">
            <FileDrop label={`${i + 1}-sertifikat faylini yuklash`} onFile={(f) => onFile(i, f)} busy={busyIndex === i} style={{ width: 64, height: 64, padding: 0 }}>
              {c.image ? <MediaThumb media={c.image} width={62} height={62} rounded={9} /> : <Icon name="upload" size={20} />}
            </FileDrop>
            <input aria-label={`${i + 1}-sertifikat nomi`} className={inputClass} maxLength={2000} placeholder={locale !== 'uz' ? lt(c.title, 'uz') || 'Sertifikat nomi' : 'Sertifikat nomi'} value={lt(c.title, locale)} onChange={(e) => patch(i, { title: setLt(c.title, locale, e.target.value) })} />
            <input aria-label={`${i + 1}-sertifikat yili`} className={`${inputClass} tabular-nums`} maxLength={20} placeholder="Yil" value={c.year} onChange={(e) => patch(i, { year: e.target.value })} />
            {c.image_id ? <StatusTag tone="ok">Yuklangan</StatusTag> : <StatusTag tone="warn">Fayl yo‘q</StatusTag>}
            <button type="button" aria-label={`${i + 1}-sertifikatni o‘chirish`} onClick={() => onChange(items.filter((_, j) => j !== i))} className="am-btn-o flex size-9 cursor-pointer items-center justify-center rounded-control border border-line bg-white p-0 text-ink-2">
              <Icon name="trash" size={16} />
            </button>
          </li>
        ))}
      </ul>
      {!items.length && <p className="mt-3 text-sm text-ink-2">Sertifikat qo‘shilmagan.</p>}
      <button
        type="button"
        onClick={() => onChange([...items, { title: { uz: '', ru: '', en: '' }, year: '', image_id: null, image: null }])}
        className="am-btn-o mt-4 flex h-9 cursor-pointer items-center gap-2 rounded-control border border-line-strong bg-white px-3.5 text-sm font-medium"
      >
        <PlusIcon size={12} />
        Sertifikat qo‘shish
      </button>
    </section>
  )
}
