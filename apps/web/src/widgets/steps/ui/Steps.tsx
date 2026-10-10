import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { SectionHeader } from '@/shared/ui/Section'

/** «Qanday ishlaymiz» — 4 qadam (matnlar lug‘atda) */
export function Steps({ t }: { t: Dictionary }) {
  return (
    <section className="bg-sand py-18 lg:py-26" aria-labelledby="home-steps">
      <div className="container-site">
        <SectionHeader
          id="home-steps"
          label={t.home.stepsLabel}
          title={t.home.stepsTitle}
          aside={<p className="text-[17px] leading-relaxed text-ink-2">{t.home.stepsLead}</p>}
        />
        <ol className="reveal mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {t.home.steps.map((s, i) => (
            <li key={s.title} className={`flex flex-col gap-3.5 ${i > 0 ? 'lg:border-l lg:border-line-strong lg:pl-8' : ''} lg:pr-8`}>
              <span className="text-sm font-semibold text-coral-ink">
                {t.home.step} {i + 1}
              </span>
              <h3 className="text-[22px] leading-snug font-semibold tracking-[-0.015em]">{s.title}</h3>
              <p className="text-base leading-relaxed text-ink-2">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
