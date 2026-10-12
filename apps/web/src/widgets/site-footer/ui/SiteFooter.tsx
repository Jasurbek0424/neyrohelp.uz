import Link from 'next/link'

import { phoneLabel, telegramHandle, type Site } from '@/entities/settings'
import { localePath, routes } from '@/shared/config/routes'
import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { telHref } from '@/shared/lib/format'
import { Logo } from '@/shared/ui/Logo'

export function SiteFooter({ locale, t, site }: { locale: Locale; t: Dictionary; site: Site }) {
  const pages = [
    { href: localePath(locale, routes.clinic), label: t.nav.clinic },
    { href: localePath(locale, routes.services), label: t.nav.services },
    { href: localePath(locale, routes.doctors), label: t.nav.doctors },
    { href: localePath(locale, routes.blog), label: t.nav.blog },
    { href: localePath(locale, routes.contacts), label: t.nav.contacts },
  ]
  const tg = telegramHandle(site)

  return (
    <footer className="bg-footer pb-24 text-white md:pb-0">
      <div className="container-site grid-site gap-y-10 pt-18 pb-12">
        <div className="col-span-4 lg:col-span-4">
          <Logo inverted />
          <p className="mt-5 max-w-80 text-[15px] leading-relaxed text-mist">{t.footer.about}</p>
        </div>
        <nav aria-labelledby="footer-pages" className="col-span-2 flex flex-col gap-3 text-[15px] lg:col-span-2">
          <h2 id="footer-pages" className="mb-1 text-[13px] font-normal text-mist">
            {t.footer.pages}
          </h2>
          {pages.map((p) => (
            <Link key={p.href} href={p.href} className="hover:text-mist">
              {p.label}
            </Link>
          ))}
        </nav>
        <div className="col-span-2 flex flex-col gap-3 text-[15px] lg:col-span-3">
          <h2 className="mb-1 text-[13px] font-normal text-mist">{t.footer.contacts}</h2>
          <a href={telHref(site.phone)} className="font-semibold">
            {phoneLabel(site)}
          </a>
          {tg ? (
            <a href={tg.href} target="_blank" rel="noopener noreferrer">
              Telegram: {tg.label}
            </a>
          ) : null}
          {site.email ? <a href={`mailto:${site.email}`}>{site.email}</a> : null}
          {site.address ? <address className="text-mist not-italic">{site.address}</address> : null}
        </div>
        <div className="col-span-4 flex flex-col gap-3 text-[15px] lg:col-span-3">
          <h2 className="mb-1 text-[13px] font-normal text-mist">{t.footer.hours}</h2>
          {site.hours.map((h) => (
            <div key={h.days} className="flex justify-between gap-4 text-mist">
              <span>{h.days}</span>
              <span className="text-white">{h.time}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="container-site">
        <div className="flex flex-col gap-3 border-t border-white/15 py-6 text-[13px] text-mist sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} NeyroHelp
            {site.license_number ? ` · ${t.common.license} № ${site.license_number}` : ''}
          </span>
          <Link href={localePath(locale, '/maxfiylik')} className="hover:text-white">
            {t.common.privacy}
          </Link>
        </div>
      </div>
    </footer>
  )
}
