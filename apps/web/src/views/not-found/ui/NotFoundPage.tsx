'use client'

import { useParams } from 'next/navigation'

import { isLocale, type Locale } from '@/shared/i18n/config'
import { ButtonLink } from '@/shared/ui/Button'
import { ArrowRight } from '@/shared/ui/Icons'

// Client komponent: not-found params olmaydi, server'da headers() esa [locale] segmentini dinamik qiladi.
// Shuning uchun til useParams'dan, matnlar — shu kichik lug‘atdan (butun lug‘at brauzerga yuklanmaydi).
const text: Record<Locale, { title: string; text: string; back: string }> = {
  uz: { title: 'Sahifa topilmadi', text: 'Havola eskirgan yoki manzilda xato bor.', back: 'Bosh sahifaga qaytish' },
  ru: { title: 'Страница не найдена', text: 'Ссылка устарела или в адресе ошибка.', back: 'На главную' },
  en: { title: 'Page not found', text: 'The link is out of date or the address has a typo.', back: 'Back to home' },
}

export function NotFoundPage() {
  const params = useParams<{ locale?: string }>()
  const locale: Locale = isLocale(params?.locale) ? params.locale : 'uz'
  const t = text[locale]
  return (
    <section className="container-site py-20 lg:py-32" aria-labelledby="nf-title">
      <p aria-hidden className="text-[clamp(6rem,4rem+10vw,12rem)] leading-none font-semibold tracking-[-0.05em] text-navy">
        404
      </p>
      <h1 id="nf-title" className="mt-8 text-h1 font-semibold text-balance">
        {t.title}
      </h1>
      <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-2">{t.text}</p>
      <ButtonLink href={`/${locale}`} className="mt-9">
        {t.back}
        <ArrowRight />
      </ButtonLink>
    </section>
  )
}
