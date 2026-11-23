import type { HomePage } from '@/entities/page'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { Photo } from '@/shared/ui/Photo'
import { SectionLabel } from '@/shared/ui/Section'

import { GalleryCarousel } from './GalleryCarousel'

/** Bosh sahifa galereyasi: admin «Bosh sahifa → Rasmlar» dagi fotolar karuselda; rasm bo‘lmasa bo‘lim chiqmaydi */
export function HomeGallery({ t, home }: { t: Dictionary; home: HomePage }) {
  const images = home.hero_images.filter((h) => h.image?.url)
  if (!images.length) return null

  return (
    <section className="py-18 lg:py-28" aria-labelledby="home-gallery">
      <div className="container-site">
        <SectionLabel>
          <span id="home-gallery">{t.home.galleryLabel}</span>
        </SectionLabel>
        <div className="reveal mt-8">
          <GalleryCarousel
            labels={{ prev: t.common.prev, next: t.common.next, pause: t.home.galleryPause, play: t.home.galleryPlay }}
            slides={images.map((h) => (
              <figure key={h.image?.url}>
                <Photo
                  media={h.image}
                  zoom
                  className="aspect-[4/3]"
                  sizes="(min-width: 1440px) 680px, (min-width: 640px) 50vw, 100vw"
                />
                {h.label ? <figcaption className="mt-3 text-[15px] text-ink-2">{h.label}</figcaption> : null}
              </figure>
            ))}
          />
        </div>
      </div>
    </section>
  )
}
