import { phoneLabel, telegramHandle, type Site } from '@/entities/settings'
import { LeadForm } from '@/features/lead-submit'
import { localePath } from '@/shared/config/routes'
import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { telHref } from '@/shared/lib/format'
import { SectionLabel } from '@/shared/ui/Section'

const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? '')

/** Navy fonli ariza seksiyasi (#ariza) — bosh sahifa va «Aloqa»da bir xil */
export function LeadSection({ locale, t, site }: { locale: Locale; t: Dictionary; site: Site }) {
  const time = site.response_time || '15'
  const tg = telegramHandle(site)
  type Row = { label: string; value: string; href?: string; external?: boolean }
  const rows: Row[] = [{ label: t.common.phone, value: phoneLabel(site), href: telHref(site.phone) }]
  if (tg) rows.push({ label: t.common.telegram, value: tg.label, href: tg.href, external: true })
  if (site.address) rows.push({ label: t.common.address, value: site.address })

  return (
    <section id="ariza" aria-labelledby="ariza-title" className="scroll-mt-28 bg-navy py-16 text-white lg:py-24">
      <div className="container-site grid-site gap-y-12">
        <div className="col-span-4 flex flex-col justify-between gap-10 lg:col-span-5">
          <div>
            <SectionLabel light>{t.lead.label}</SectionLabel>
            <h2 id="ariza-title" className="mt-5 text-[clamp(2rem,1.5rem+1.4vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
              {t.lead.title}
            </h2>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-mist">{fill(t.lead.lead, { time })}</p>
          </div>
          <dl className="border-t border-white/15">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-6 border-b border-white/15 py-4 text-base">
                <dt className="text-mist">{r.label}</dt>
                <dd className="text-right font-semibold">
                  {r.href ? (
                    <a href={r.href} {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                      {r.value}
                    </a>
                  ) : (
                    r.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="col-span-4 rounded-card bg-white p-6 text-ink sm:p-10 lg:col-span-6 lg:col-start-7">
          <LeadForm locale={locale} t={t.lead} privacyLabel={t.common.privacy} privacyHref={localePath(locale, '/maxfiylik')} responseTime={time} />
        </div>
      </div>
    </section>
  )
}
