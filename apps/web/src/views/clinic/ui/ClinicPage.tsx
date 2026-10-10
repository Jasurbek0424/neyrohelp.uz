import type { Metadata } from 'next'

import { getClinicPage } from '@/entities/page'
import { getSite, phoneLabel } from '@/entities/settings'
import { bookingPath, localePath, routes } from '@/shared/config/routes'
import { getDictionary, type Locale } from '@/shared/i18n'
import { localeFrom } from '@/shared/i18n/params'
import { safeUrl, telHref } from '@/shared/lib/format'
import { pageMetadata } from '@/shared/lib/seo'
import { ButtonLink } from '@/shared/ui/Button'
import { ArrowRight, FileIcon } from '@/shared/ui/Icons'
import { Photo } from '@/shared/ui/Photo'
import { SectionHeader, SectionLabel } from '@/shared/ui/Section'
import { PageHero } from '@/widgets/page-hero'

type Props = { params: Promise<{ locale: string }> }

const copyHint: Record<Locale, string> = {
  uz: 'Nusxa administratordan so‘raladi',
  ru: 'Копию можно запросить у администратора',
  en: 'Ask the administrator for a copy',
}

export async function generateClinicMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params)
  const clinic = await getClinicPage(locale)
  return pageMetadata({ locale, path: routes.clinic, title: clinic.title || getDictionary(locale).nav.clinic, description: clinic.lead, image: clinic.cover })
}

export async function ClinicPage({ params }: Props) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)
  const [clinic, site] = await Promise.all([getClinicPage(locale), getSite(locale)])
  const stats = site.stats.slice(0, 4)

  return (
    <>
      <PageHero
        crumbs={[{ href: localePath(locale), label: t.nav.home }, { href: localePath(locale, routes.clinic), label: t.nav.clinic }]}
        crumbsLabel={t.common.breadcrumb}
        title={clinic.title || t.nav.clinic}
        lead={clinic.lead}
      />

      <section className="container-site py-10 lg:py-14" aria-label={t.nav.clinic}>
        <figure>
          <Photo
            media={clinic.cover}
            placeholder={`${t.common.photo} — ${t.nav.clinic.toLowerCase()}`}
            className="aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-[1280/560]"
            sizes="(min-width: 1440px) 1280px, 100vw"
            priority
          />
          <figcaption className="mt-4 flex flex-col justify-between gap-1 text-sm text-ink-2 sm:flex-row sm:gap-6">
            <span>Fig. 01{clinic.cover_caption ? ` — ${clinic.cover_caption}` : ''}</span>
            {site.address ? <span>{site.address}</span> : null}
          </figcaption>
        </figure>
      </section>

      {clinic.approach.length ? (
        <section className="container-site py-12 lg:py-20" aria-labelledby="clinic-approach">
          <div className="grid-site gap-y-10">
            <div className="col-span-4">
              <SectionLabel>{t.clinic.approachLabel}</SectionLabel>
              <h2 id="clinic-approach" className="mt-5 text-h2 font-semibold text-balance">
                {clinic.approach_title || t.clinic.approachLabel}
              </h2>
            </div>
            <ol className="col-span-4 lg:col-span-7 lg:col-start-6">
              {clinic.approach.map((a, i) => (
                <li key={a.title} className={`grid grid-cols-[3rem_1fr] gap-x-4 py-8 lg:grid-cols-[4.5rem_1fr] ${i > 0 ? 'border-t border-line-strong' : 'pt-0'}`}>
                  <span className="text-sm font-semibold text-coral-ink">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="text-[22px] leading-snug font-semibold tracking-[-0.015em] lg:text-2xl">{a.title}</h3>
                    <p className="mt-3 text-[17px] leading-relaxed text-ink-2">{a.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {stats.length ? (
        <section className="bg-sand" aria-labelledby="clinic-numbers">
          <h2 id="clinic-numbers" className="sr-only">
            {t.clinic.numbersLabel}
          </h2>
          <dl className="container-site grid grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={`${s.label}-${i}`}
                className={`flex flex-col-reverse justify-end py-8 lg:py-12 ${i % 2 ? 'border-l border-line-strong pl-5' : 'pr-5'} ${i > 0 ? 'lg:border-l lg:border-line-strong lg:pl-8' : ''} ${i >= 2 ? 'border-t border-line-strong lg:border-t-0' : ''}`}
              >
                <dt className="mt-3 text-[15px] text-ink-2">{s.label}</dt>
                <dd className="text-3xl leading-none font-semibold tracking-[-0.03em] sm:text-[40px] lg:text-5xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {clinic.equipment.length ? (
        <section className="container-site py-18 lg:py-28" aria-labelledby="clinic-equipment">
          <SectionHeader id="clinic-equipment" label={t.clinic.equipmentLabel} title={t.clinic.equipmentTitle} />
          <ul className="reveal mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
            {clinic.equipment.map((e, i) => (
              <li key={`${e.name}-${i}`}>
                <Photo media={e.image} placeholder={`${t.common.photo} — ${e.name}`} className="aspect-[3/2]" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" />
                <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.015em]">{e.name}</h3>
                {e.purpose ? <p className="mt-2 text-base leading-relaxed text-ink-2">{e.purpose}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {clinic.documents.length ? (
        <section className="bg-sand py-18 lg:py-26" aria-labelledby="clinic-docs">
          <div className="container-site">
            <SectionHeader id="clinic-docs" label={t.clinic.documentsLabel} title={t.clinic.documentsTitle} />
            <ul className="mt-12 border-t border-ink lg:mt-14">
              {clinic.documents.map((d, i) => {
                const url = safeUrl(d.file_url)
                return (
                  <li
                    key={`${d.title}-${i}`}
                    className="grid grid-cols-[2rem_1fr] items-center gap-x-4 gap-y-2 border-b border-line-strong py-6 lg:grid-cols-[3rem_5fr_3fr_3fr] lg:gap-x-6"
                  >
                    <FileIcon className="text-ink-2" />
                    <span className="text-lg font-semibold">{d.title}</span>
                    <span className="col-start-2 text-[15px] text-ink-2 lg:col-start-3">{d.number}</span>
                    <span className="col-start-2 text-[15px] lg:col-start-4 lg:text-right">
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="link-underline font-medium">
                          {t.clinic.viewPdf}
                          <span className="sr-only"> — {d.title}</span>
                        </a>
                      ) : (
                        <span className="text-ink-2">{copyHint[locale]}</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="bg-navy py-16 text-white lg:py-24" aria-labelledby="clinic-cta">
        <div className="container-site grid-site items-end gap-y-8">
          <div className="col-span-4 lg:col-span-7">
            <h2 id="clinic-cta" className="text-h2 font-semibold text-balance">
              {t.clinic.ctaTitle}
            </h2>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-mist">{t.clinic.ctaText}</p>
          </div>
          <div className="col-span-4 flex flex-col items-start gap-5 lg:col-span-5 lg:items-end">
            <ButtonLink href={bookingPath(locale)} variant="white">
              {t.common.book}
              <ArrowRight />
            </ButtonLink>
            <a href={telHref(site.phone)} className="text-2xl font-semibold tracking-tight">
              {phoneLabel(site)}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
