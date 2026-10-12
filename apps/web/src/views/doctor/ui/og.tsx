import { getDoctor } from '@/entities/doctor'
import { isLocale } from '@/shared/i18n/config'
import { SITE_URL } from '@/shared/config/env'
import { renderOgImage } from '@/shared/lib/og'

export async function doctorOgImage(params: Promise<{ locale: string; slug: string }>) {
  const { locale: raw, slug } = await params
  const locale = isLocale(raw) ? raw : 'uz'
  const doctor = await getDoctor(slug, locale)
  return renderOgImage({
    eyebrow: doctor?.specialty.title ?? 'NeyroHelp',
    title: doctor?.full_name ?? 'NeyroHelp',
    footer: SITE_URL.replace(/^https?:\/\//, ''),
  })
}
