import { getHomePage } from '@/entities/page'
import { getDictionary, isLocale, type Dictionary } from '@/shared/i18n'
import { SITE_URL } from '@/shared/config/env'
import { renderOgImage } from '@/shared/lib/og'

export type OgPage = 'home' | 'clinic' | 'services' | 'doctors' | 'blog' | 'contacts'

const titles: Record<Exclude<OgPage, 'home'>, (t: Dictionary) => [eyebrow: string, title: string]> = {
  clinic: (t) => [t.nav.clinic, t.meta.defaultTitle],
  services: (t) => [t.nav.services, t.services.title],
  doctors: (t) => [t.nav.doctors, t.home.doctorsTitle],
  blog: (t) => [t.nav.blog, t.home.blogTitle],
  contacts: (t) => [t.nav.contacts, t.contacts.title],
}

const host = SITE_URL.replace(/^https?:\/\//, '')

/** Statik sahifalar uchun OG rasm (sarlavha lug‘atdan, bosh sahifa — API'dagi hero matni) */
export async function staticOgImage(params: Promise<{ locale: string }>, page: OgPage) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : 'uz'
  const t = getDictionary(locale)
  if (page === 'home') {
    const home = await getHomePage(locale)
    return renderOgImage({ eyebrow: home.hero_eyebrow || t.meta.siteName, title: home.hero_title || t.meta.defaultTitle, footer: host })
  }
  const [eyebrow, title] = titles[page](t)
  return renderOgImage({ eyebrow, title, footer: host })
}
