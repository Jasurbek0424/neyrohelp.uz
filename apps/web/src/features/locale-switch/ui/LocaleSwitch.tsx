'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { localeLabels, locales, type Locale } from '@/shared/i18n/config'

const LOCALE_PREFIX = /^\/(uz|ru|en)(?=\/|$)/

/** Joriy sahifaning boshqa tildagi versiyasiga o‘tadi va tanlovni cookie'da eslab qoladi */
export function LocaleSwitch({ current, label, tone = 'light' }: { current: Locale; label: string; tone?: 'light' | 'dark' }) {
  const pathname = usePathname() ?? `/${current}`
  const rest = pathname.replace(LOCALE_PREFIX, '')

  return (
    <nav aria-label={label} className="flex items-center gap-1">
      {locales.map((locale) => {
        const active = locale === current
        const color =
          tone === 'light'
            ? active
              ? 'font-semibold text-white'
              : 'text-mist hover:text-white'
            : active
              ? 'font-semibold text-ink'
              : 'text-ink-2 hover:text-ink'
        return (
          <Link
            key={locale}
            href={`/${locale}${rest}`}
            hrefLang={locale}
            lang={locale}
            prefetch={false}
            aria-current={active ? 'true' : undefined}
            onClick={() => {
              document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`
            }}
            className={`inline-flex min-h-6 min-w-8 items-center justify-center px-1 ${color}`}
          >
            {localeLabels[locale]}
          </Link>
        )
      })}
    </nav>
  )
}
