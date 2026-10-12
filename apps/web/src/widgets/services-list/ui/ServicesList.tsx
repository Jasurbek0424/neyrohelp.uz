import Link from 'next/link'

import type { ServiceGroup } from '@/entities/service'
import { localePath, routes } from '@/shared/config/routes'
import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { ArrowRight } from '@/shared/ui/Icons'
import { SectionHeader } from '@/shared/ui/Section'

/** Bosh sahifadagi yo‘nalishlar — tahririy raqamlangan ro‘yxat */
export function ServicesList({ locale, t, groups }: { locale: Locale; t: Dictionary; groups: ServiceGroup[] }) {
  if (!groups.length) return null
  const base = localePath(locale, routes.services)
  return (
    <section className="container-site py-18 lg:py-28" aria-labelledby="home-services">
      <SectionHeader
        id="home-services"
        label={t.home.servicesLabel}
        title={t.home.servicesTitle}
        aside={
          <>
            <p className="text-[17px] leading-relaxed text-ink-2">{t.home.servicesLead}</p>
            <Link href={base} className="link-underline font-medium">
              {t.common.allServices}
            </Link>
          </>
        }
      />
      <ul className="reveal-stagger mt-12 border-t border-ink lg:mt-14">
        {groups.map((g, i) => (
          <li key={g.id}>
            <Link
              href={`${base}#${g.slug}`}
              className="group grid grid-cols-[2.5rem_1fr_1.5rem] items-center gap-x-4 gap-y-1 border-b border-line px-0 py-6 transition-colors duration-200 hover:bg-sand sm:px-4 lg:h-24 lg:grid-cols-[5rem_4fr_5fr_2.5rem] lg:gap-6 lg:py-0"
            >
              <span className="text-sm font-semibold text-coral-ink">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-[22px] font-semibold tracking-[-0.02em] lg:text-[26px]">{g.title}</span>
              <ArrowRight size={20} className="col-start-3 row-start-1 transition-transform group-hover:translate-x-1 lg:col-start-4" />
              <span className="col-span-2 col-start-2 text-base leading-normal text-ink-2 lg:col-span-1 lg:col-start-3 lg:row-start-1">{g.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
