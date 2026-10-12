import Link from 'next/link'

import { DoctorCard, type DoctorCardData } from '@/entities/doctor'
import { localePath, routes } from '@/shared/config/routes'
import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { SectionHeader } from '@/shared/ui/Section'

type Props = {
  locale: Locale
  t: Dictionary
  doctors: DoctorCardData[]
  /** home — bosh sahifa sarlavhasi; others — shifokor sahifasidagi «Boshqa shifokorlar» */
  variant?: 'home' | 'others'
  className?: string
}

export function DoctorsGrid({ locale, t, doctors, variant = 'home', className = '' }: Props) {
  if (!doctors.length) return null
  const id = variant === 'home' ? 'home-doctors' : 'doctor-others'
  return (
    <section className={`py-18 lg:py-28 ${className}`} aria-labelledby={id}>
      <div className="container-site">
        {variant === 'home' ? (
          <SectionHeader
            id={id}
            label={t.home.doctorsLabel}
            title={t.home.doctorsTitle}
            aside={
              <Link href={localePath(locale, routes.doctors)} className="link-underline font-medium lg:self-end">
                {t.common.allDoctors}
              </Link>
            }
          />
        ) : (
          <h2 id={id} className="text-h2 font-semibold text-balance">
            {t.doctors.others}
          </h2>
        )}
        <ul className="reveal-stagger mt-12 grid grid-cols-2 gap-x-4 gap-y-10 lg:mt-14 lg:grid-cols-4 lg:gap-8">
          {doctors.map((d) => (
            <li key={d.id}>
              <DoctorCard doctor={d} locale={locale} t={t} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
