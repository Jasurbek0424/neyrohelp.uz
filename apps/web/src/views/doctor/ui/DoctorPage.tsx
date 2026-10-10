import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getDoctor, getDoctors } from '@/entities/doctor'
import { getSitemapIndex } from '@/entities/page'
import { CLINIC_ID, getSite, phoneLabel } from '@/entities/settings'
import { bookingPath, doctorPath, localePath, routes } from '@/shared/config/routes'
import { getDictionary } from '@/shared/i18n'
import { localeFrom } from '@/shared/i18n/params'
import { formatPrice, telHref } from '@/shared/lib/format'
import { absoluteUrl, mediaUrl, pageMetadata, SITE_NAME } from '@/shared/lib/seo'
import { ButtonLink } from '@/shared/ui/Button'
import { ArrowRight } from '@/shared/ui/Icons'
import { JsonLd } from '@/shared/ui/JsonLd'
import { Photo } from '@/shared/ui/Photo'
import { SectionLabel } from '@/shared/ui/Section'
import { DoctorsGrid } from '@/widgets/doctors-grid'
import { Breadcrumbs } from '@/widgets/page-hero'

import { Timeline } from './Timeline'

type Props = { params: Promise<{ locale: string; slug: string }> }

/** Build vaqtida barcha shifokorlar (API /public/sitemap); yangilari birinchi so‘rovda yaratiladi (dynamicParams) */
export async function doctorStaticParams() {
  const { doctors } = await getSitemapIndex()
  return doctors.map((d) => ({ slug: d.slug }))
}

export async function generateDoctorMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params)
  const { slug } = await params
  const doctor = await getDoctor(slug, locale)
  if (!doctor) return {}
  return pageMetadata({
    locale,
    path: `${routes.doctors}/${doctor.slug}`,
    title: doctor.seo.title || `${doctor.full_name} — ${doctor.specialty.title}`,
    description: doctor.seo.description || doctor.lead,
    image: doctor.photo,
    type: 'profile',
  })
}

export async function DoctorPage({ params }: Props) {
  const locale = await localeFrom(params)
  const { slug } = await params
  const t = getDictionary(locale)
  const doctor = await getDoctor(slug, locale)
  if (!doctor) notFound()

  const [site, others] = await Promise.all([getSite(locale), getDoctors(locale, { exclude: doctor.id, limit: 4 })])

  const facts = [
    { label: t.doctors.experience, value: doctor.experience_years ? `${doctor.experience_years} ${t.common.years}` : null },
    { label: t.doctors.qualification, value: doctor.qualification },
    { label: t.doctors.price, value: doctor.price != null ? formatPrice(doctor.price, t) : null },
    { label: t.doctors.languages, value: doctor.languages },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value))
  const days = doctor.work_days.filter((d) => t.doctors.days[d])
  const url = absoluteUrl(doctorPath(locale, doctor.slug))

  return (
    <>
      <div className="container-site pt-10 lg:pt-16">
        <Breadcrumbs
          label={t.common.breadcrumb}
          items={[
            { href: localePath(locale), label: t.nav.home },
            { href: localePath(locale, routes.doctors), label: t.nav.doctors },
            { href: doctorPath(locale, doctor.slug), label: doctor.full_name },
          ]}
        />
      </div>

      <section className="container-site grid-site gap-y-10 py-10 lg:py-16" aria-labelledby="doctor-name">
        <Photo
          media={doctor.photo}
          placeholder={`${t.common.photo} — ${doctor.full_name}`}
          className="col-span-4 aspect-[4/5] lg:col-span-5"
          sizes="(min-width: 1440px) 520px, (min-width: 1024px) 40vw, 100vw"
          priority
        />
        <div className="col-span-4 lg:col-span-6 lg:col-start-7">
          <SectionLabel>{doctor.specialty.title}</SectionLabel>
          <h1 id="doctor-name" className="mt-5 text-h1 font-semibold text-balance">
            {doctor.full_name}
          </h1>
          {doctor.lead ? <p className="mt-6 text-[19px] leading-relaxed text-ink-2">{doctor.lead}</p> : null}

          {facts.length ? (
            <dl className="mt-8 grid grid-cols-2 border-t border-ink">
              {facts.map((f, i) => (
                <div key={f.label} className={`border-b border-line py-4 ${i % 2 ? 'border-l pl-5' : 'pr-5'}`}>
                  <dt className="text-[13px] text-ink-2">{f.label}</dt>
                  <dd className="mt-1.5 text-[17px] font-semibold">{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {days.length ? (
            <div className="mt-8">
              <p id="doctor-days" className="text-[13px] text-ink-2">
                {t.doctors.workDays}
              </p>
              <ul aria-labelledby="doctor-days" className="mt-2.5 flex flex-wrap gap-2">
                {days.map((d) => (
                  <li key={d} className="rounded-control bg-navy-soft px-3 py-1.5 text-sm font-medium text-navy">
                    {t.doctors.days[d]}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <ButtonLink href={bookingPath(locale)}>
              {t.doctors.bookThis}
              <ArrowRight />
            </ButtonLink>
            <a href={telHref(site.phone)} className="text-xl font-semibold tracking-tight">
              {phoneLabel(site)}
            </a>
          </div>
        </div>
      </section>

      {doctor.education.length || doctor.career.length ? (
        <section className="bg-sand py-16 lg:py-24" aria-labelledby="doctor-edu">
          <div className="container-site">
            <h2 id="doctor-edu" className="text-h2 font-semibold text-balance">
              {t.doctors.educationTitle}
            </h2>
            <div className="mt-10 grid gap-x-8 gap-y-12 lg:mt-12 lg:grid-cols-2">
              {doctor.education.length ? <Timeline title={t.doctors.education} rows={doctor.education} /> : null}
              {doctor.career.length ? <Timeline title={t.doctors.career} rows={doctor.career} /> : null}
            </div>
          </div>
        </section>
      ) : null}

      {doctor.certificates.length ? (
        <section className="container-site py-16 lg:py-24" aria-labelledby="doctor-certs">
          <h2 id="doctor-certs" className="text-h2 font-semibold text-balance">
            {t.doctors.certificates}
          </h2>
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 lg:mt-12 lg:grid-cols-4 lg:gap-x-8">
            {doctor.certificates.map((c, i) => (
              <li key={`${c.title}-${i}`}>
                <Photo media={c.image} placeholder={t.doctors.certificates} className="aspect-[3/4]" sizes="(min-width: 1024px) 25vw, 50vw" />
                <p className="mt-4 font-semibold">{c.title}</p>
                {c.year ? <p className="mt-1 text-sm text-ink-2">{c.year}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <DoctorsGrid locale={locale} t={t} doctors={others} variant="others" className={doctor.certificates.length ? 'bg-sand' : ''} />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Physician',
          '@id': `${url}#physician`,
          name: doctor.full_name,
          url,
          image: mediaUrl(doctor.photo),
          description: doctor.lead,
          medicalSpecialty: doctor.specialty.title,
          knowsLanguage: doctor.languages || undefined,
          telephone: site.phone,
          address: site.address
            ? { '@type': 'PostalAddress', streetAddress: site.address, addressLocality: 'Toshkent', addressCountry: 'UZ' }
            : undefined,
          memberOf: { '@type': 'MedicalClinic', '@id': CLINIC_ID, name: SITE_NAME },
          ...(doctor.price != null ? { priceRange: formatPrice(doctor.price, t) } : {}),
        }}
      />
    </>
  )
}
