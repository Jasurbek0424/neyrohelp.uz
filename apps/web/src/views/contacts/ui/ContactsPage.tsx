import type { Metadata } from 'next'

import { getSite, phoneLabel, telegramHandle, type DirectionRow } from '@/entities/settings'
import { localePath, routes } from '@/shared/config/routes'
import { getDictionary } from '@/shared/i18n'
import { localeFrom } from '@/shared/i18n/params'
import { safeUrl, telHref } from '@/shared/lib/format'
import { pageMetadata } from '@/shared/lib/seo'
import { BusIcon, CarIcon, MetroIcon, PinIcon } from '@/shared/ui/Icons'
import { SectionLabel } from '@/shared/ui/Section'
import { LeadSection } from '@/widgets/lead-section'
import { PageHero } from '@/widgets/page-hero'

type Props = { params: Promise<{ locale: string }> }

const directionIcons: Record<DirectionRow['kind'], typeof MetroIcon> = { metro: MetroIcon, bus: BusIcon, car: CarIcon }

export async function generateContactsMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)
  return pageMetadata({ locale, path: routes.contacts, title: t.contacts.title, description: t.contacts.lead })
}

export async function ContactsPage({ params }: Props) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)
  const site = await getSite(locale)

  const tg = telegramHandle(site)
  const hasCoords = typeof site.lat === 'number' && typeof site.lng === 'number'
  const yandex = safeUrl(site.yandex_map_url)
  const google = safeUrl(site.google_map_url)

  const rows = [
    { label: t.common.telegram, value: tg?.label, href: tg?.href, external: true },
    { label: t.common.email, value: site.email, href: site.email ? `mailto:${site.email}` : undefined },
    { label: t.common.address, value: site.address },
    { label: t.common.landmark, value: site.landmark },
  ].filter((r) => r.value)

  return (
    <>
      <PageHero
        crumbs={[{ href: localePath(locale), label: t.nav.home }, { href: localePath(locale, routes.contacts), label: t.nav.contacts }]}
        crumbsLabel={t.common.breadcrumb}
        title={t.contacts.title}
        lead={t.contacts.lead}
      />

      <section className="container-site py-12 lg:py-20" aria-labelledby="contacts-info">
        <h2 id="contacts-info" className="sr-only">
          {t.nav.contacts}
        </h2>
        <div className="grid-site gap-y-12">
          <div className="col-span-4 lg:col-span-5">
            <dl>
              <div className="border-b border-line-strong pb-6">
                <dt className="text-[13px] text-ink-2">{t.common.forBooking}</dt>
                <dd className="mt-2">
                  <a href={telHref(site.phone)} className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">
                    {phoneLabel(site)}
                  </a>
                </dd>
              </div>
              {rows.map((r) => (
                <div key={r.label} className="grid grid-cols-[7rem_1fr] gap-4 border-b border-line-strong py-5 text-base">
                  <dt className="text-ink-2">{r.label}</dt>
                  <dd className="font-medium">
                    {r.href ? (
                      <a href={r.href} className="link-underline" {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                        {r.value}
                      </a>
                    ) : (
                      r.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            {site.hours.length ? (
              <div className="mt-10">
                <SectionLabel>{t.common.workHours}</SectionLabel>
                <table className="mt-5 w-full border-t border-ink text-base">
                  <caption className="sr-only">{t.common.workHours}</caption>
                  <tbody>
                    {site.hours.map((h) => (
                      <tr key={h.days} className="border-b border-line">
                        <th scope="row" className="py-3.5 pr-4 text-left font-normal text-ink-2">
                          {h.days}
                        </th>
                        <td className="py-3.5 text-right font-semibold">{h.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <div className="col-span-4 lg:col-span-7 lg:col-start-6">
            <div className="relative min-h-[360px] overflow-hidden rounded-card bg-photo lg:min-h-[560px]">
              {hasCoords ? (
                <iframe
                  title={t.contacts.mapTitle}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://yandex.uz/map-widget/v1/?ll=${site.lng},${site.lat}&z=16&pt=${site.lng},${site.lat},pm2rdm`}
                  className="absolute inset-0 size-full rounded-card border-0"
                />
              ) : (
                <div role="img" aria-label={t.contacts.mapTitle} className="photo-placeholder absolute inset-0">
                  <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4">
                    <span className="grid size-12 place-items-center rounded-full bg-navy text-white">
                      <PinIcon size={24} />
                    </span>
                    <span className="rounded-control bg-white px-4 py-3 text-center text-[15px] font-medium">
                      NeyroMed{site.address ? ` · ${site.address}` : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {yandex || google ? (
              <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
                {yandex ? (
                  <a href={yandex} target="_blank" rel="noopener noreferrer" className="link-underline font-medium">
                    {t.contacts.openYandex}
                  </a>
                ) : null}
                {google ? (
                  <a href={google} target="_blank" rel="noopener noreferrer" className="link-underline font-medium">
                    {t.contacts.openGoogle}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <LeadSection locale={locale} t={t} site={site} />

      {site.directions.length ? (
        <section className="container-site py-18 lg:py-28" aria-labelledby="contacts-directions">
          <SectionLabel>{t.contacts.howToGet}</SectionLabel>
          <h2 id="contacts-directions" className="mt-5 text-h2 font-semibold text-balance">
            {t.contacts.howToGet}
          </h2>
          <ul className="mt-12 grid gap-10 border-t border-ink pt-10 md:grid-cols-3 lg:gap-0">
            {site.directions.map((d, i) => {
              const Icon = directionIcons[d.kind]
              return (
                <li key={`${d.kind}-${i}`} className={`flex flex-col gap-4 lg:pr-8 ${i > 0 ? 'lg:border-l lg:border-line-strong lg:pl-8' : ''}`}>
                  <Icon className="text-navy" />
                  <h3 className="text-[20px] font-semibold tracking-[-0.015em]">{t.contacts.directions[d.kind]}</h3>
                  <p className="text-base leading-relaxed text-ink-2">{d.text}</p>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </>
  )
}
