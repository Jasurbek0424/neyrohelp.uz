import type { Locale } from '@/shared/i18n/config'
import { absoluteUrl, SITE_NAME } from '@/shared/lib/seo'

import type { Site } from '../model/types'
import { telegramHandle } from './contacts'
import { parseOpeningHours } from './openingHours'

/** Klinikaning yagona @id si — Physician, Article va boshqalar shunga bog‘lanadi */
export const CLINIC_ID = absoluteUrl('/#clinic')

/** schema.org MedicalClinic (layout'da, har sahifada) */
export function clinicJsonLd(site: Site, locale: Locale, description?: string) {
  const tg = telegramHandle(site)
  const hasGeo = typeof site.lat === 'number' && typeof site.lng === 'number'
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    '@id': CLINIC_ID,
    name: SITE_NAME,
    url: absoluteUrl(`/${locale}`),
    logo: absoluteUrl('/icon.png'),
    image: absoluteUrl(`/${locale}/opengraph-image`),
    description,
    telephone: site.phone,
    email: site.email ?? undefined,
    medicalSpecialty: 'Neurologic',
    isAcceptingNewPatients: true,
    availableLanguage: ['uz', 'ru'],
    address: site.address
      ? { '@type': 'PostalAddress', streetAddress: site.address, addressLocality: 'Toshkent', addressRegion: 'Toshkent', addressCountry: 'UZ' }
      : undefined,
    geo: hasGeo ? { '@type': 'GeoCoordinates', latitude: site.lat, longitude: site.lng } : undefined,
    hasMap: site.yandex_map_url || site.google_map_url || undefined,
    openingHoursSpecification: parseOpeningHours(site.hours) ?? undefined,
    sameAs: tg ? [tg.href] : undefined,
  }
}
