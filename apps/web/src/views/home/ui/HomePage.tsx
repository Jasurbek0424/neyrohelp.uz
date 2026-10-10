import type { Metadata } from 'next'

import { getDoctors } from '@/entities/doctor'
import { getHomePage } from '@/entities/page'
import { getPosts } from '@/entities/post'
import { getServiceGroups } from '@/entities/service'
import { getSite } from '@/entities/settings'
import { getDictionary } from '@/shared/i18n'
import { localeFrom } from '@/shared/i18n/params'
import { pageMetadata } from '@/shared/lib/seo'
import { JsonLd } from '@/shared/ui/JsonLd'
import { BlogGrid } from '@/widgets/blog-grid'
import { ClinicBlock } from '@/widgets/clinic-block'
import { DoctorsGrid } from '@/widgets/doctors-grid'
import { Faq } from '@/widgets/faq'
import { HomeHero, QuickInfo } from '@/widgets/hero'
import { LeadSection } from '@/widgets/lead-section'
import { ServicesList } from '@/widgets/services-list'
import { Steps } from '@/widgets/steps'

type Props = { params: Promise<{ locale: string }> }

export async function generateHomeMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)
  const home = await getHomePage(locale)
  return pageMetadata({ locale, path: '', title: t.meta.defaultTitle, absoluteTitle: true, description: home.hero_lead || t.meta.defaultDescription })
}

export async function HomePage({ params }: Props) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)

  const [site, home, groups, homeDoctors, posts] = await Promise.all([
    getSite(locale),
    getHomePage(locale),
    getServiceGroups(locale),
    getDoctors(locale, { home: true, limit: 4 }),
    getPosts(locale, { limit: 3 }),
  ])
  const doctors = homeDoctors.length ? homeDoctors : await getDoctors(locale, { limit: 4 })

  return (
    <>
      <HomeHero locale={locale} t={t} home={home} site={site} />
      <QuickInfo t={t} site={site} />
      <ServicesList locale={locale} t={t} groups={groups.filter((g) => g.show_on_home)} />
      <Steps t={t} />
      <DoctorsGrid locale={locale} t={t} doctors={doctors} />
      <ClinicBlock locale={locale} t={t} home={home} />
      <BlogGrid locale={locale} t={t} posts={posts.items} />
      <Faq t={t} items={home.faq} site={site} />
      <LeadSection locale={locale} t={t} site={site} />

      {home.faq.length ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            inLanguage: locale,
            mainEntity: home.faq.map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          }}
        />
      ) : null}
    </>
  )
}
