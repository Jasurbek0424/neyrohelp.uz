import Link from 'next/link'

import { phoneLabel, type Site } from '@/entities/settings'
import { LocaleSwitch } from '@/features/locale-switch'
import { bookingPath, localePath, routes } from '@/shared/config/routes'
import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { telHref } from '@/shared/lib/format'
import { ButtonLink } from '@/shared/ui/Button'
import { Logo } from '@/shared/ui/Logo'

import { MobileMenu } from './MobileMenu'
import { NavLinks } from './NavLinks'

const skipText: Record<Locale, string> = { uz: 'Asosiy qismga o‘tish', ru: 'К содержимому', en: 'Skip to content' }

export function SiteHeader({ locale, t, site }: { locale: Locale; t: Dictionary; site: Site }) {
  const items = [
    { href: localePath(locale, routes.clinic), label: t.nav.clinic },
    { href: localePath(locale, routes.services), label: t.nav.services },
    { href: localePath(locale, routes.doctors), label: t.nav.doctors },
    { href: localePath(locale, routes.blog), label: t.nav.blog },
    { href: localePath(locale, routes.contacts), label: t.nav.contacts },
  ]
  const phone = { href: telHref(site.phone), label: phoneLabel(site) }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-navy focus:px-4 focus:py-3 focus:text-white"
      >
        {skipText[locale]}
      </a>
      <header className="header-elevate sticky top-0 z-40 bg-white">
        <div className="bg-navy text-[13px] text-mist">
          <div className="container-site flex h-9 items-center justify-between">
            <div className="flex gap-7">
              {site.hours_short ? <span>{site.hours_short}</span> : null}
              {site.address ? <span className="hidden sm:inline">{site.address}</span> : null}
            </div>
            <LocaleSwitch current={locale} label={t.nav.language} />
          </div>
        </div>
        <div className="border-b border-line">
          <div className="container-site flex h-18 items-stretch gap-6 lg:gap-14">
            <Link href={localePath(locale)} aria-label={`NeyroHelp — ${t.nav.home}`} className="flex items-center">
              <Logo />
            </Link>
            <div className="flex-1">
              <NavLinks items={items} label={t.nav.main} />
            </div>
            <div className="flex items-center gap-6">
              <a href={phone.href} className="hidden flex-col leading-tight xl:flex">
                <span className="text-xs text-ink-2">{t.common.book}</span>
                <span className="font-semibold">{phone.label}</span>
              </a>
              <div className="hidden md:block">
                <ButtonLink href={bookingPath(locale)} size="sm">
                  {t.common.leaveRequest}
                </ButtonLink>
              </div>
              <MobileMenu
                items={items}
                openLabel={t.nav.openMenu}
                closeLabel={t.nav.closeMenu}
                phone={phone}
                cta={{ href: bookingPath(locale), label: t.common.book }}
              >
                <LocaleSwitch current={locale} label={t.nav.language} tone="dark" />
              </MobileMenu>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
