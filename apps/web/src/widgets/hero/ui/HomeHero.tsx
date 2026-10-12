import type { HomePage } from '@/entities/page'
import type { Site } from '@/entities/settings'
import { localePath, routes } from '@/shared/config/routes'
import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { ButtonLink } from '@/shared/ui/Button'
import { ArrowRight } from '@/shared/ui/Icons'
import { NeuroConstellation } from '@/shared/ui/neuro-constellation'

/** Bosh sahifa hero: chapda matn va raqamlar, o‘ngda miyadan logoga aylanadigan nuqtalar */
export function HomeHero({ locale, t, home, site }: { locale: Locale; t: Dictionary; home: HomePage; site: Site }) {
  return (
    <section className="relative" aria-labelledby="home-title">
      <div className="container-site relative grid-site gap-y-10 py-12 lg:min-h-[800px] lg:py-20">
        <div className="col-span-4 flex flex-col lg:col-span-6">
          {home.hero_eyebrow ? (
            <p className="rise flex items-center gap-2.5 text-[15px] font-medium text-ink-2">
              <span aria-hidden className="size-2 bg-coral" />
              {home.hero_eyebrow}
            </p>
          ) : null}
          <h1 id="home-title" className="mt-6 text-display font-semibold text-balance">
            {home.hero_title || t.meta.defaultTitle}
          </h1>
          {home.hero_lead ? <p className="rise-2 mt-6 max-w-[520px] text-[19px] leading-relaxed text-ink-2">{home.hero_lead}</p> : null}
          <div className="rise-2 mt-9 flex flex-wrap gap-3">
            <ButtonLink href="#ariza">
              {t.common.book}
              <ArrowRight />
            </ButtonLink>
            <ButtonLink href={localePath(locale, routes.doctors)} variant="outline">
              {t.common.seeDoctors}
            </ButtonLink>
          </div>
          {site.stats.length ? (
            <dl className="rise-3 mt-12 grid grid-cols-3 border-t border-ink lg:mt-auto">
              {site.stats.slice(0, 3).map((s, i) => (
                <div key={`${s.label}-${i}`} className={`flex flex-col-reverse justify-end pt-5 ${i > 0 ? 'border-l border-line pl-4 sm:pl-5' : 'pr-4'}`}>
                  <dt className="mt-1.5 text-[13px] text-ink-2 sm:text-sm">{s.label}</dt>
                  <dd className="text-2xl font-semibold tracking-tight sm:text-[32px]">{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        <NeuroConstellation className="relative col-span-4 aspect-square lg:col-span-6 lg:aspect-auto lg:min-h-[560px]" />
      </div>
    </section>
  )
}
