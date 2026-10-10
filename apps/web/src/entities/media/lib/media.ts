import type { Media, UploadKind } from '../model/types'

const MAX_BYTES = 10 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const DOC_TYPES = ['application/pdf']

/** Client tomonidagi tez tekshiruv (backend baribir magic bytes bilan qayta tekshiradi). null — xato yo‘q */
export function validateUpload(file: File, kind: UploadKind = 'image'): string | null {
  const allowed = kind === 'image' ? IMAGE_TYPES : [...IMAGE_TYPES, ...DOC_TYPES]
  if (!allowed.includes(file.type)) {
    return kind === 'image' ? 'Faqat JPEG, PNG yoki WebP rasm yuklash mumkin.' : 'Faqat JPEG, PNG, WebP yoki PDF fayl yuklash mumkin.'
  }
  if (file.size > MAX_BYTES) return 'Fayl hajmi 10 MB dan oshmasligi kerak.'
  if (file.size === 0) return 'Fayl bo‘sh.'
  return null
}

/** Berilgan kenglikka eng yaqin (undan katta yoki teng) variant; bo‘lmasa eng kattasi; rasm bo‘lmasa null */
export function mediaThumb(media: Media | null | undefined, width: number): string | null {
  if (!media || media.kind !== 'image') return null
  const sizes = Object.keys(media.srcset ?? {})
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  const pick = sizes.find((w) => w >= width) ?? sizes.at(-1)
  return pick !== undefined ? (media.srcset[String(pick)] ?? media.url) : media.url
}
