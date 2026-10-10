import type { Metadata } from 'next'

import { DoctorCard, getDoctors, getSpecialties } from '@/entities/doctor'
import { DoctorFilter } from '@/features/doctor-filter'
import { localePath, routes } from '@/shared/config/routes'
import { getDictionary } from '@/shared/i18n'
import { localeFrom } from '@/shared/i18n/params'
import { pageMetadata } from '@/shared/lib/seo'
import { PageHero } from '@/widgets/page-hero'

type Props = { params: Promise<{ locale: string }> }

export async function generateDoctorsMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)
  return pageMetadata({ locale, path: routes.doctors, title: t.doctors.title, description: t.doctors.lead })
}

/**
 * Statik sahifa (ISR): barcha shifokorlar server'da render qilinadi,
 * mutaxassislik filtri (?mutaxassislik=) brauzerda — server so‘rovisiz.
 */
export async function DoctorsPage({ params }: Props) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)
  const [specialties, doctors] = await Promise.all([getSpecialties(locale), getDoctors(locale)])
  const base = localePath(locale, routes.doctors)

  return (
    <>
      <PageHero
        crumbs={[{ href: localePath(locale), label: t.nav.home }, { href: base, label: t.nav.doctors }]}
        crumbsLabel={t.common.breadcrumb}
        title={t.doctors.title}
        lead={t.doctors.lead}
        divider={false}
      />
      <DoctorFilter
        basePath={base}
        specialties={specialties.map((s) => ({ slug: s.slug, title: s.title, count: doctors.filter((d) => d.specialty.slug === s.slug).length }))}
        items={doctors.map((d, i) => ({
          key: d.slug,
          specialty: d.specialty.slug,
          node: <DoctorCard doctor={d} locale={locale} t={t} showAudience priority={i < 2} headingLevel={2} />,
        }))}
        labels={{ all: t.common.all, filter: t.doctors.filter, empty: t.doctors.empty, list: t.doctors.title }}
      />
    </>
  )
}
