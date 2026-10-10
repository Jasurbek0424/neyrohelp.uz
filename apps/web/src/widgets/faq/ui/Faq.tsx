import type { FaqRow } from '@/entities/page'
import { phoneLabel, type Site } from '@/entities/settings'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { telHref } from '@/shared/lib/format'
import { Plus } from '@/shared/ui/Icons'
import { SectionLabel } from '@/shared/ui/Section'

/**
 * Savollar. JS'siz akkordeon: native <details name="faq"> — bir vaqtda bittasi ochiq,
 * klaviatura va ekran o‘quvchilari uchun tayyor.
 */
export function Faq({ t, items, site }: { t: Dictionary; items: FaqRow[]; site: Site }) {
  if (!items.length) return null
  return (
    <section className="bg-sand py-18 lg:py-26" aria-labelledby="home-faq">
      <div className="container-site grid-site gap-y-10">
        <div className="col-span-4 lg:col-span-4">
          <SectionLabel>{t.home.faqLabel}</SectionLabel>
          <h2 id="home-faq" className="mt-5 text-[clamp(1.875rem,1.4rem+1.4vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.03em]">
            {t.home.faqTitle}
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
            {t.home.faqLead}{' '}
            <a href={telHref(site.phone)} className="link-underline font-semibold text-ink">
              {phoneLabel(site)}
            </a>
          </p>
        </div>
        <div className="col-span-4 border-t border-ink lg:col-span-7 lg:col-start-6">
          {items.map((item, i) => (
            <details key={item.question} name="faq" open={i === 0} className="group border-b border-line-strong">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5.5 text-[19px] font-medium tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                <h3>{item.question}</h3>
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-control border border-field bg-white">
                  <Plus className="transition-transform duration-300 ease-(--ease-soft) group-open:rotate-45" />
                </span>
              </summary>
              <p className="pr-4 pb-6 text-[17px] leading-relaxed text-ink-2 sm:pr-18">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
