import Link from 'next/link'

import { doctorPath } from '@/shared/config/routes'
import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { Photo } from '@/shared/ui/Photo'

import { audienceLabel } from '../lib/audience'
import type { DoctorCardData } from '../model/types'

type Props = {
  doctor: DoctorCardData
  locale: Locale
  t: Dictionary
  priority?: boolean
  showAudience?: boolean
  headingLevel?: 2 | 3
}

export function DoctorCard({ doctor, locale, t, priority, showAudience, headingLevel = 3 }: Props) {
  const H = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <Link href={doctorPath(locale, doctor.slug)} className="group flex flex-col gap-5">
      <Photo
        media={doctor.photo}
        placeholder={`${t.common.photo} — ${doctor.full_name}`}
        className="aspect-[3/4]"
        sizes="(min-width: 1440px) 300px, (min-width: 1024px) 22vw, 50vw"
        zoom
        priority={priority}
      />
      <div>
        <H className="text-xl font-semibold tracking-[-0.01em] group-hover:text-navy">{doctor.full_name}</H>
        <p className="mt-1.5 text-[15px] text-ink-2">
          {doctor.specialty.title}
          {doctor.experience_years ? ` · ${doctor.experience_years} ${t.common.yearsExperience}` : ''}
        </p>
        {showAudience ? (
          <span className="mt-3 inline-block rounded bg-navy-soft px-2 py-1 text-xs font-medium text-navy">{audienceLabel(doctor.audience, t)}</span>
        ) : null}
      </div>
    </Link>
  )
}
