'use client'

import { MediaThumb, useUploadMedia, validateUpload, type Media } from '@/entities/media'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { Notice } from '@/shared/ui/admin/EmptyState'
import { FileDrop } from '@/shared/ui/admin/FileDrop'
import { toast } from '@/shared/ui/admin/Toast'

/** Portret: FormData bilan yuklash, 3:4 preview, almashtirish/olib tashlash */
export function PortraitCard({ photo, name, onChange }: { photo: Media | null; name: string; onChange: (m: Media | null) => void }) {
  const upload = useUploadMedia()
  const onFile = (file: File) => {
    const err = validateUpload(file, 'image')
    if (err) return toast.error(err)
    upload.mutate({ file, alt: name }, { onSuccess: (m) => onChange(m), onError: (e) => toast.error(errorMessage(e, 'Rasmni yuklab bo‘lmadi')) })
  }
  return (
    <section aria-labelledby="pt-title" className="rounded-card border border-line bg-white p-4">
      <h2 id="pt-title" className="m-0 mb-3 text-base font-semibold">
        Portret
      </h2>
      <FileDrop
        label={photo ? 'Portretni almashtirish' : 'Portret rasmini yuklash'}
        onFile={onFile}
        busy={upload.isPending}
        hint="JPG/PNG, 3:4, kamida 900×1200"
        className="mx-auto"
        style={{ width: 168, height: 224, padding: photo ? 0 : 12 }}
      >
        {photo ? <MediaThumb media={photo} width={166} height={222} alt="" rounded={9} /> : undefined}
      </FileDrop>
      {photo ? (
        <div className="mt-3 flex items-center justify-between text-xs text-ink-2">
          <span className="tabular-nums">
            {photo.width}×{photo.height}
          </span>
          <button type="button" onClick={() => onChange(null)} className="am-link cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-ink">
            Olib tashlash
          </button>
        </div>
      ) : (
        <Notice className="mt-3 px-2.5! py-2! text-xs!">Portret yuklanmagan — saytda placeholder ko‘rinadi</Notice>
      )}
    </section>
  )
}
