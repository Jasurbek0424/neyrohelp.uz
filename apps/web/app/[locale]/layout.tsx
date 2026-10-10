import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { htmlLang, locales } from '@/shared/i18n/config'
import { localeFrom } from '@/shared/i18n/params'
import { SiteLayout, siteMetadata, siteViewport } from '@/views/site-layout'

import '@/app/styles/globals.css'

type Props = { children: ReactNode; params: Promise<{ locale: string }> }

export const dynamicParams = false
export const viewport = siteViewport

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  return siteMetadata(await localeFrom(params))
}

export default async function LocaleLayout({ children, params }: Props) {
  const locale = await localeFrom(params)
  return (
    <html lang={htmlLang[locale]}>
      <body className="min-h-dvh">
        <SiteLayout locale={locale}>{children}</SiteLayout>
      </body>
    </html>
  )
}
