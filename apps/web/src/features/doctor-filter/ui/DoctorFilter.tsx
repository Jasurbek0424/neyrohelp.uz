'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'

import { SPECIALTY_PARAM } from '../model/params'

type Props = {
  basePath: string
  specialties: { slug: string; title: string; count: number }[]
  /** Server'da render qilingan kartalar (RSC) — filtr faqat ko‘rinishni tanlaydi */
  items: { key: string; specialty: string; node: ReactNode }[]
  labels: { all: string; filter: string; empty: string; list: string }
}

const chip = 'inline-flex h-10 items-center rounded-control border px-4 text-[15px] font-medium whitespace-nowrap transition-colors'

/**
 * Shifokorlar filtri. Sahifa statik (SSG/ISR): HTML'da barcha shifokorlar bor (SEO, JS'siz ham ishlaydi),
 * `?mutaxassislik=` brauzerda o‘qiladi va ro‘yxat server so‘rovisiz filtrlanadi.
 */
export function DoctorFilter(props: Props) {
  return (
    <Suspense fallback={<FilterView {...props} active={undefined} />}>
      <WithParams {...props} />
    </Suspense>
  )
}

function WithParams(props: Props) {
  const value = useSearchParams().get(SPECIALTY_PARAM)
  const active = props.specialties.find((s) => s.slug === value)?.slug
  return <FilterView {...props} active={active} />
}

function FilterView({ basePath, specialties, items, labels, active }: Props & { active: string | undefined }) {
  const visible = active ? items.filter((i) => i.specialty === active) : items
  return (
    <>
      <div className="container-site">
        <nav aria-label={labels.filter} className="-mx-5 overflow-x-auto px-5 pb-8 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
          <ul className="flex gap-2">
            <li>
              <Link
                href={basePath}
                scroll={false}
                aria-current={!active ? 'page' : undefined}
                className={`${chip} ${!active ? 'border-navy bg-navy text-white' : 'border-line hover:border-ink'}`}
              >
                {labels.all}
              </Link>
            </li>
            {specialties.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`${basePath}?${SPECIALTY_PARAM}=${encodeURIComponent(s.slug)}`}
                  scroll={false}
                  aria-current={active === s.slug ? 'page' : undefined}
                  className={`${chip} ${active === s.slug ? 'border-navy bg-navy text-white' : 'border-line hover:border-ink'}`}
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-b border-ink" />
      </div>

      <section className="container-site py-10 lg:py-16" aria-label={labels.list}>
        {visible.length ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
            {visible.map((i) => (
              <li key={i.key}>{i.node}</li>
            ))}
          </ul>
        ) : (
          <p role="status" className="py-10 text-[17px] text-ink-2">
            {labels.empty}
          </p>
        )}
      </section>
    </>
  )
}
