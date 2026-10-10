import { phoneLabel, telegramHandle, type Site } from '@/entities/settings'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { telHref } from '@/shared/lib/format'

/** Hero ostidagi tezkor ma’lumot tasmasi: ish vaqti, telefon, manzil, Telegram */
export function QuickInfo({ t, site }: { t: Dictionary; site: Site }) {
  const tg = telegramHandle(site)
  const items = [
    { label: t.common.workHours, value: site.hours_short },
    { label: t.common.forBooking, value: phoneLabel(site), href: telHref(site.phone) },
    { label: t.common.address, value: site.address },
    { label: t.common.telegram, value: tg?.label, href: tg?.href, external: true },
  ].filter((x) => x.value)

  return (
    <section aria-label={t.home.quickInfo} className="bg-sand">
      <dl className="container-site grid grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`py-6 lg:py-7.5 ${i % 2 ? 'border-l border-line pl-5' : 'pr-5'} ${i >= 1 ? 'lg:border-l lg:border-line lg:pl-6' : ''} ${i >= 2 ? 'border-t border-line lg:border-t-0' : ''}`}
          >
            <dt className="text-[13px] text-ink-2">{item.label}</dt>
            <dd className="mt-1.5 text-base font-semibold sm:text-lg">
              {item.href ? (
                <a href={item.href} {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                  {item.value}
                </a>
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
