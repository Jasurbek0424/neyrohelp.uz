import type { Metadata, Viewport } from 'next'

import { getDictionary, type Locale } from '@/shared/i18n'
import { SITE_URL } from '@/shared/config/env'
import { SITE_NAME } from '@/shared/lib/seo'

export const siteViewport: Viewport = {
  themeColor: '#13294B',
  width: 'device-width',
  initialScale: 1,
}

export function siteMetadata(locale: Locale): Metadata {
  const t = getDictionary(locale)
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    title: { default: t.meta.defaultTitle, template: `%s — ${SITE_NAME}` },
    description: t.meta.defaultDescription,
    formatDetection: { telephone: false, address: false, email: false },
    openGraph: { siteName: SITE_NAME, type: 'website' },
  }
}
