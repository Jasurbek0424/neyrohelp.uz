import { locales } from '@/shared/i18n/config'
import { ogContentType, ogSize } from '@/shared/lib/og'
import { staticOgImage } from '@/views/site-layout'

export const alt = 'NeyroMed'
export const size = ogSize
export const contentType = ogContentType
export const revalidate = 3600

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default function Image({ params }: { params: Promise<{ locale: string }> }) {
  return staticOgImage(params, 'services')
}
