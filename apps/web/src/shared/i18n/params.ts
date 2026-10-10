import 'server-only'

import { notFound } from 'next/navigation'

import { isLocale, type Locale } from './config'

/** Route params'dan tilni oladi; noma’lum til — 404 */
export async function localeFrom(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return locale
}
