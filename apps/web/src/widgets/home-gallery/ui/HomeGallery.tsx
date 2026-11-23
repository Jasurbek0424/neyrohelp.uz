import type { HomePage } from '@/entities/page'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { Photo } from '@/shared/ui/Photo'
import { SectionLabel } from '@/shared/ui/Section'

/** Bosh sahifa galereyasi: admin «Bosh sahifa → Rasmlar» dagi fotolar; rasm bo‘lmasa bo‘lim chiqmaydi */
export function HomeGallery({ t, home }: { t: Dictionary; home: HomePage }) {
  const images = home.hero_images.filter((h) => h.image?.url)
  if (!images.length) return null

  return (
    <section className="py-18 lg:py-28" aria-labelledby="home-gallery">
      <div className="container-site">
        <SectionLabel>
          <span id="home-gallery">{t.home.galleryLabel}</span>
        </SectionLabel>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((h, idx) => (
            <li key={h.image?.url ?? idx} className="reveal">
              <figure>
                <Photo
                  media={h.image}
                  zoom
                  className="aspect-[4/3]"
                  sizes="(min-width: 1440px) 440px, (min-width: 1024px) 31vw, (min-width: 640px) 50vw, 100vw"
                />
                {h.label ? <figcaption className="mt-3 text-[15px] text-ink-2">{h.label}</figcaption> : null}
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
