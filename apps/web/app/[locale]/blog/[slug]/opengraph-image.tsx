import { locales } from '@/shared/i18n/config'
import { ogContentType, ogSize } from '@/shared/lib/og'
import { articleOgImage, articleStaticParams } from '@/views/article'

export const alt = 'NeyroHelp'
export const size = ogSize
export const contentType = ogContentType
export const revalidate = 3600

export async function generateStaticParams() {
  const slugs = await articleStaticParams()
  return locales.flatMap((locale) => slugs.map((s) => ({ locale, ...s })))
}

export default function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  return articleOgImage(params)
}
