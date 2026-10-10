import type { Metadata } from 'next'

import { getServiceGroups, type ServiceGroup } from '@/entities/service'
import { CLINIC_ID } from '@/entities/settings'
import { bookingPath, localePath, routes } from '@/shared/config/routes'
import { getDictionary, type Locale } from '@/shared/i18n'
import { localeFrom } from '@/shared/i18n/params'
import { absoluteUrl, pageMetadata, SITE_NAME } from '@/shared/lib/seo'
import { ButtonLink } from '@/shared/ui/Button'
import { ArrowRight } from '@/shared/ui/Icons'
import { JsonLd } from '@/shared/ui/JsonLd'
import { PageHero } from '@/widgets/page-hero'
import { PriceList } from '@/widgets/price-list'

type Props = { params: Promise<{ locale: string }> }

export async function generateServicesMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)
  return pageMetadata({ locale, path: routes.services, title: t.services.title, description: t.services.lead })
}

/** Narxi ko‘rsatilgan xizmatlar uchun OfferCatalog (narxsiz xizmatlar Offer sifatida chiqmaydi) */
function offerCatalog(groups: ServiceGroup[], locale: Locale, title: string) {
  const url = absoluteUrl(`/${locale}${routes.services}`)
  const catalogs = groups
    .map((g) => ({
      '@type': 'OfferCatalog',
      name: g.title,
      url: `${url}#${g.slug}`,
      itemListElement: g.services
        .filter((s) => typeof s.price === 'number' && s.price > 0)
        .map((s) => ({
          '@type': 'Offer',
          url: `${url}#${g.slug}`,
          priceCurrency: 'UZS',
          ...(s.price_from
            ? { priceSpecification: { '@type': 'PriceSpecification', minPrice: s.price, priceCurrency: 'UZS' } }
            : { price: s.price }),
          itemOffered: { '@type': 'MedicalProcedure', name: s.title, description: s.note || undefined },
        })),
    }))
    .filter((c) => c.itemListElement.length > 0)
  if (!catalogs.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    '@id': CLINIC_ID,
    name: SITE_NAME,
    hasOfferCatalog: { '@type': 'OfferCatalog', name: title, url, itemListElement: catalogs },
  }
}

export async function ServicesPage({ params }: Props) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)
  const groups = (await getServiceGroups(locale)).filter((g) => g.services.length > 0)
  const catalog = offerCatalog(groups, locale, t.services.title)

  return (
    <>
      <PageHero
        crumbs={[{ href: localePath(locale), label: t.nav.home }, { href: localePath(locale, routes.services), label: t.nav.services }]}
        crumbsLabel={t.common.breadcrumb}
        title={t.services.title}
        lead={t.services.lead}
      />
      <PriceList locale={locale} t={t} groups={groups} />
      <section className="bg-sand py-16 lg:py-20" aria-labelledby="services-help">
        <div className="container-site grid-site items-center gap-y-6">
          <div className="col-span-4 lg:col-span-7">
            <h2 id="services-help" className="text-[26px] leading-tight font-semibold tracking-[-0.02em] lg:text-[32px]">
              {t.services.helpTitle}
            </h2>
            <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-ink-2">{t.services.helpText}</p>
          </div>
          <div className="col-span-4 lg:col-span-5 lg:justify-self-end">
            <ButtonLink href={bookingPath(locale)}>
              {t.common.book}
              <ArrowRight />
            </ButtonLink>
          </div>
        </div>
      </section>
      {catalog ? <JsonLd data={catalog} /> : null}
    </>
  )
}
