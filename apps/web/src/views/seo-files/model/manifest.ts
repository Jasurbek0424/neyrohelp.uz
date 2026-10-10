import type { MetadataRoute } from 'next'

import { getDictionary } from '@/shared/i18n'
import { defaultLocale } from '@/shared/i18n/config'

export function buildManifest(): MetadataRoute.Manifest {
  const t = getDictionary(defaultLocale)
  return {
    name: t.meta.defaultTitle,
    short_name: t.meta.siteName,
    description: t.meta.defaultDescription,
    lang: 'uz',
    start_url: `/${defaultLocale}`,
    scope: '/',
    display: 'browser',
    background_color: '#FFFFFF',
    theme_color: '#13294B',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
