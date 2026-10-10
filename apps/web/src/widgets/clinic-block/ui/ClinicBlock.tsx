import Link from 'next/link'

import type { HomePage } from '@/entities/page'
import { localePath, routes } from '@/shared/config/routes'
import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { Photo } from '@/shared/ui/Photo'
import { SectionLabel } from '@/shared/ui/Section'

/** Bosh sahifadagi «Klinika» bloki: chapda foto, o‘ngda matn va punktlar */
export function ClinicBlock({ locale, t, home }: { locale: Locale; t: Dictionary; home: HomePage }) {
  return (
    <section className="bg-sand py-18 lg:py-28" aria-labelledby="home-clinic">
      <div className="container-site grid-site gap-y-10">
        <Photo
          media={home.clinic_image}
          placeholder={`${t.common.photo} — ${t.home.clinicLabel.toLowerCase()}`}
          className="reveal col-span-4 aspect-[4/3] lg:col-span-7 lg:aspect-auto lg:min-h-[496px]"
          sizes="(min-width: 1440px) 740px, (min-width: 1024px) 58vw, 100vw"
        />
        <div className="col-span-4 flex flex-col justify-between gap-10 lg:col-span-5 lg:pl-6">
          <div>
            <SectionLabel>{t.home.clinicLabel}</SectionLabel>
            <h2 id="home-clinic" className="mt-5 text-[clamp(1.875rem,1.4rem+1.2vw,2.5rem)] leading-[1.1] font-semibold tracking-[-0.03em] text-balance">
              {home.clinic_title}
            </h2>
            {home.clinic_text ? <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{home.clinic_text}</p> : null}
          </div>
          <div>
            {home.clinic_points.length ? (
              <ul className="border-b border-line-strong">
                {home.clinic_points.map((p) => (
                  <li key={p} className="flex gap-3.5 border-t border-line-strong py-4 text-base">
                    <span aria-hidden className="font-semibold text-coral">
                      —
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            ) : null}
            <Link href={localePath(locale, routes.clinic)} className="link-underline mt-6 inline-block font-medium">
              {t.common.aboutClinic}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
