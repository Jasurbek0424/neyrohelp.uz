import Link from 'next/link'

import type { ServiceGroup } from '@/entities/service'
import { bookingPath } from '@/shared/config/routes'
import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { formatPrice } from '@/shared/lib/format'

/** «Yo‘nalishlar» sahifasi: chapda kategoriya navigatsiyasi, o‘ngda narxlar jadvali (mobilda kartalar) */
export function PriceList({ locale, t, groups }: { locale: Locale; t: Dictionary; groups: ServiceGroup[] }) {
  const book = bookingPath(locale)
  return (
    <div className="container-site py-8 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:py-16">
      <nav
        aria-label={t.services.categories}
        className="sticky top-28 z-30 -mx-5 mb-8 border-b border-line bg-white px-5 py-3 sm:-mx-8 sm:px-8 lg:static lg:top-auto lg:z-auto lg:col-span-3 lg:m-0 lg:border-0 lg:p-0"
      >
        <div className="lg:sticky lg:top-32">
          <p className="hidden text-sm font-medium text-ink-2 lg:block">{t.services.categories}</p>
          <ul className="flex gap-2 overflow-x-auto lg:mt-4 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-t lg:border-ink">
            {groups.map((g) => (
              <li key={g.id} className="shrink-0">
                <a
                  href={`#${g.slug}`}
                  className="flex h-10 items-center rounded-control border border-line px-4 text-[15px] font-medium whitespace-nowrap transition-colors hover:border-ink lg:h-auto lg:justify-between lg:gap-4 lg:rounded-none lg:border-0 lg:border-b lg:px-0 lg:py-3.5 lg:text-base lg:hover:text-navy"
                >
                  {g.title}
                  <span className="hidden text-sm text-ink-2 lg:inline">{g.services.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="lg:col-span-9 lg:col-start-4">
        {groups.map((g, gi) => (
          <section key={g.id} id={g.slug} aria-labelledby={`${g.slug}-title`} className={`scroll-mt-40 lg:scroll-mt-32 ${gi > 0 ? 'mt-14 lg:mt-20' : ''}`}>
            <h2 id={`${g.slug}-title`} className="text-[26px] leading-tight font-semibold tracking-[-0.02em]">
              {g.title}
            </h2>
            {g.description ? <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-ink-2">{g.description}</p> : null}

            {/* md+: jadval */}
            <table className="mt-6 hidden w-full border-t border-ink text-left md:table">
              <caption className="sr-only">{g.title}</caption>
              <thead>
                <tr className="border-b border-line text-[13px] text-ink-2">
                  <th scope="col" className="py-3 pr-4 font-normal">
                    {t.services.service}
                  </th>
                  <th scope="col" className="w-36 py-3 pr-4 font-normal">
                    {t.services.duration}
                  </th>
                  <th scope="col" className="w-48 py-3 pr-4 font-normal">
                    {t.services.price}
                  </th>
                  <th scope="col" className="w-32 py-3">
                    <span className="sr-only">{t.common.book}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {g.services.map((s) => (
                  <tr key={s.id} className="h-19 border-b border-line">
                    <th scope="row" className="py-3 pr-4 text-left align-middle font-medium">
                      <span className="block text-[17px]">{s.title}</span>
                      {s.note ? <span className="mt-1 block text-sm font-normal text-ink-2">{s.note}</span> : null}
                    </th>
                    <td className="pr-4 align-middle text-[15px] text-ink-2">{s.duration_minutes ? `${s.duration_minutes} ${t.common.minutes}` : '—'}</td>
                    <td className="pr-4 align-middle text-[17px] font-semibold">{formatPrice(s.price, t, s.price_from)}</td>
                    <td className="text-right align-middle">
                      <Link href={book} className="link-underline font-medium">
                        {t.services.bookShort}
                        <span className="sr-only"> — {s.title}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* mobil: kartalar */}
            <ul className="mt-6 border-t border-ink md:hidden">
              {g.services.map((s) => (
                <li key={s.id} className="border-b border-line py-5">
                  <p className="text-[17px] leading-snug font-medium">{s.title}</p>
                  {s.note ? <p className="mt-1 text-sm text-ink-2">{s.note}</p> : null}
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="text-[15px] text-ink-2">
                      {s.duration_minutes ? `${s.duration_minutes} ${t.common.minutes} · ` : ''}
                      <span className="font-semibold text-ink">{formatPrice(s.price, t, s.price_from)}</span>
                    </p>
                    <Link href={book} className="link-underline shrink-0 font-medium">
                      {t.services.bookShort}
                      <span className="sr-only"> — {s.title}</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
