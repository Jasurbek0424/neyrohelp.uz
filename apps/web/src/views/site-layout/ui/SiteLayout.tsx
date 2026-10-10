import type { ReactNode } from 'react'

import { clinicJsonLd, getSite } from '@/entities/settings'
import { bookingPath } from '@/shared/config/routes'
import { getDictionary, type Locale } from '@/shared/i18n'
import { telHref } from '@/shared/lib/format'
import { JsonLd } from '@/shared/ui/JsonLd'
import { MobileCta } from '@/widgets/mobile-cta'
import { SiteFooter } from '@/widgets/site-footer'
import { SiteHeader } from '@/widgets/site-header'

/** Public sayt qobig‘i: header, main, footer, mobil CTA va MedicalClinic JSON-LD */
export async function SiteLayout({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = getDictionary(locale)
  const site = await getSite(locale)
  return (
    <>
      <SiteHeader locale={locale} t={t} site={site} />
      <main id="main">{children}</main>
      <SiteFooter locale={locale} t={t} site={site} />
      <MobileCta phoneHref={telHref(site.phone)} callLabel={t.common.call} cta={{ href: bookingPath(locale), label: t.common.book }} />
      <JsonLd data={clinicJsonLd(site, locale, t.meta.defaultDescription)} />
    </>
  )
}
