import type { Metadata } from 'next'

import { getSite, hasCoords, phoneLabel, siteBranches, telegramHandle, type Branch, type DirectionRow } from '@/entities/settings'
import { localePath, routes } from '@/shared/config/routes'
import { getDictionary } from '@/shared/i18n'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { localeFrom } from '@/shared/i18n/params'
import { safeUrl, telHref } from '@/shared/lib/format'
import { pageMetadata } from '@/shared/lib/seo'
import { BusIcon, CarIcon, MetroIcon, PinIcon } from '@/shared/ui/Icons'
import { SectionLabel } from '@/shared/ui/Section'
import { LeadSection } from '@/widgets/lead-section'
import { PageHero } from '@/widgets/page-hero'

type Props = { params: Promise<{ locale: string }> }

const directionIcons: Record<DirectionRow['kind'], typeof MetroIcon> = { metro: MetroIcon, bus: BusIcon, car: CarIcon }

function MapFrame({ branch, title, className }: { branch: Branch; title: string; className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-card bg-photo ${className}`}>
      {hasCoords(branch) ? (
        <iframe
          title={title}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://yandex.uz/map-widget/v1/?ll=${branch.lng},${branch.lat}&z=16&pt=${branch.lng},${branch.lat},pm2rdm`}
          className="absolute inset-0 size-full rounded-card border-0"
        />
      ) : (
        <div role="img" aria-label={title} className="photo-placeholder absolute inset-0">
          <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4">
            <span className="grid size-12 place-items-center rounded-full bg-navy text-white">
              <PinIcon size={24} />
            </span>
            <span className="rounded-control bg-white px-4 py-3 text-center text-[15px] font-medium">
              NeyroHelp{branch.address ? ` · ${branch.address}` : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function MapLinks({ branch, t, className = '' }: { branch: Branch; t: Dictionary; className?: string }) {
  const yandex = safeUrl(branch.yandex_map_url)
  const google = safeUrl(branch.google_map_url)
  if (!yandex && !google) return null
  return (
    <div className={`flex flex-wrap gap-x-8 gap-y-3 ${className}`}>
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
  )
}

/** Bir nechta filial bo‘lganda: ixcham karta — nom, manzil, telefon, kichik xarita, yo‘llar */
function BranchCard({ branch, index, t }: { branch: Branch; index: number; t: Dictionary }) {
  const name = branch.name || `${t.contacts.branchFallback} ${index + 1}`
  const rows = [
    { label: t.common.address, value: branch.address },
    { label: t.common.landmark, value: branch.landmark },
    { label: t.contacts.hours, value: branch.hours_short },
  ].filter((r) => r.value)
  return (
    <li className="flex flex-col rounded-card border border-line-strong bg-white p-5 sm:p-6">
      <h3 className="text-[20px] font-semibold tracking-[-0.015em]">{name}</h3>
      <a href={telHref(branch.phone)} className="link-underline mt-2 self-start font-semibold">
        {branch.phone_display}
      </a>
      {rows.length ? (
        <dl className="mt-4 text-[15px]">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[6.5rem_1fr] gap-3 border-t border-line py-2.5">
              <dt className="text-ink-2">{r.label}</dt>
              <dd className="font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <MapFrame branch={branch} title={`${t.contacts.mapTitle}: ${name}`} className="mt-4 aspect-[4/3]" />
      <MapLinks branch={branch} t={t} className="mt-4 text-[15px]" />
      {branch.directions.length ? (
        <ul className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
          {branch.directions.map((d, i) => {
            const Icon = directionIcons[d.kind]
            return (
              <li key={`${d.kind}-${i}`} className="flex gap-3 text-[15px] leading-relaxed">
                <Icon size={20} className="mt-0.5 shrink-0 text-navy" />
                <span>
                  <span className="font-semibold">{t.contacts.directions[d.kind]}:</span> <span className="text-ink-2">{d.text}</span>
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </li>
  )
}

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
  const branches = siteBranches(site)
  const [main] = branches as [Branch, ...Branch[]]
  const multi = branches.length > 1

  const rows = [
    { label: t.common.telegram, value: tg?.label, href: tg?.href, external: true },
    { label: t.common.email, value: site.email, href: site.email ? `mailto:${site.email}` : undefined },
    ...(multi
      ? []
      : [
          { label: t.common.address, value: site.address },
          { label: t.common.landmark, value: site.landmark },
        ]),
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
          <div className={multi ? 'col-span-4 grid gap-x-16 gap-y-12 lg:col-span-12 lg:grid-cols-2' : 'col-span-4 lg:col-span-5'}>
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
              <div className={multi ? '' : 'mt-10'}>
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

          {multi ? null : (
            <div className="col-span-4 lg:col-span-7 lg:col-start-6">
              <MapFrame branch={main} title={t.contacts.mapTitle} className="min-h-[360px] lg:min-h-[560px]" />
              <MapLinks branch={main} t={t} className="mt-5" />
            </div>
          )}
        </div>
      </section>

      {multi ? (
        <section className="container-site pb-18 lg:pb-28" aria-labelledby="contacts-branches">
          <SectionLabel>{t.contacts.branches}</SectionLabel>
          <h2 id="contacts-branches" className="sr-only">
            {t.contacts.branches}
          </h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {branches.map((b, i) => (
              <BranchCard key={i} branch={b} index={i} t={t} />
            ))}
          </ul>
        </section>
      ) : null}

      <LeadSection locale={locale} t={t} site={site} />

      {!multi && site.directions.length ? (
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
