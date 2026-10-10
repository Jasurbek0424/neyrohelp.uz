import { mediaThumb } from '../lib/media'
import type { Media } from '../model/types'

type Props = {
  media?: Media | null
  width: number | string
  height: number | string
  alt?: string
  rounded?: number
  className?: string
}

/** Admin uchun kichik rasm: kerakli o‘lchamdagi webp variant, rasm yo‘q bo‘lsa diagonal X li joy */
export function MediaThumb({ media, width, height, alt, rounded = 6, className = '' }: Props) {
  const px = typeof width === 'number' ? width * 2 : 960
  const src = mediaThumb(media, px)
  const style = { width, height, borderRadius: rounded }
  if (!src) {
    return <span aria-hidden className={`photo-placeholder inline-block shrink-0 ${className}`} style={style} />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- backend tayyorlagan webp variantlar
    <img
      src={src}
      alt={alt ?? media?.alt?.uz ?? ''}
      loading="lazy"
      decoding="async"
      className={`block shrink-0 bg-photo object-cover ${className}`}
      style={{ ...style, objectPosition: `${media?.focal_x ?? 50}% ${media?.focal_y ?? 50}%` }}
    />
  )
}
