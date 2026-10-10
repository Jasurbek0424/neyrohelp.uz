import type { components } from '@/shared/api/schema'

type MediaOut = components['schemas']['MediaOut']

type Props = {
  media?: MediaOut | null
  /** Rasm yo‘q bo‘lsa placeholder ustidagi yozuv */
  placeholder?: string
  className?: string
  /** sizes atributi: brauzer srcset'dan to‘g‘ri o‘lchamni tanlaydi */
  sizes?: string
  priority?: boolean
  zoom?: boolean
  rounded?: boolean
}

/**
 * Backend tayyorlagan webp variantlari (480/960/1600) bilan responsive <img>.
 * Next image optimizatsiyasi ishlatilmaydi — server CPU tejaladi, rasm CDN'dan immutable keshlanadi.
 * Ota element o‘lchamni beradi (aspect-*), rasm absolute bilan to‘ldiradi → CLS = 0.
 */
export function Photo({ media, placeholder, className = '', sizes = '100vw', priority, zoom, rounded = true }: Props) {
  const radius = rounded ? 'rounded-card' : ''
  if (!media?.url) {
    return (
      <div className={`photo-placeholder relative overflow-hidden ${radius} ${className}`}>
        {placeholder ? (
          <span className="absolute bottom-3.5 left-4 rounded bg-white px-2.5 py-1.5 text-xs text-ink-2 sm:text-[13px]">{placeholder}</span>
        ) : null}
      </div>
    )
  }
  const srcSet = Object.entries(media.srcset ?? {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([w, url]) => `${url} ${w}w`)
    .join(', ')
  return (
    <div className={`relative overflow-hidden bg-photo ${radius} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- oldindan optimizatsiya qilingan variantlar */}
      <img
        src={media.url}
        srcSet={srcSet || undefined}
        sizes={sizes}
        alt={media.alt ?? ''}
        width={media.width ?? undefined}
        height={media.height ?? undefined}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={`absolute inset-0 size-full object-cover ${zoom ? 'transition-transform duration-700 ease-(--ease-soft) group-hover:scale-[1.03]' : ''}`}
        style={{ objectPosition: `${media.focal_x ?? 50}% ${media.focal_y ?? 50}%` }}
      />
    </div>
  )
}
