import type { Metadata } from 'next'

import { getSite, phoneLabel } from '@/entities/settings'
import { localePath } from '@/shared/config/routes'
import { getDictionary } from '@/shared/i18n'
import { localeFrom } from '@/shared/i18n/params'
import { telHref } from '@/shared/lib/format'
import { pageMetadata } from '@/shared/lib/seo'
import { PageHero } from '@/widgets/page-hero'

import { privacyCopy } from '../model/copy'

type Props = { params: Promise<{ locale: string }> }

const PATH = '/maxfiylik'

export async function generatePrivacyMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params)
  return pageMetadata({ locale, path: PATH, title: getDictionary(locale).common.privacy, description: privacyCopy[locale].lead })
}

export async function PrivacyPage({ params }: Props) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)
  const site = await getSite(locale)
  const c = privacyCopy[locale]

  return (
    <>
      <PageHero
        crumbs={[{ href: localePath(locale), label: t.nav.home }, { href: localePath(locale, PATH), label: t.common.privacy }]}
        crumbsLabel={t.common.breadcrumb}
        title={t.common.privacy}
        lead={c.lead}
      />
      <article className="container-site py-12 lg:py-20">
        <div className="max-w-[720px] text-[17px] leading-[1.7] text-ink lg:text-[19px]">
          {c.sections.map((s, i) => (
            <section key={s.title} className="mt-10 first:mt-0" aria-labelledby={`p-${i}`}>
              <h2 id={`p-${i}`} className="text-2xl leading-tight font-semibold tracking-[-0.02em]">
                {s.title}
              </h2>
              <p className="mt-3 text-ink-2">{s.text}</p>
            </section>
          ))}
          <p className="mt-10 text-ink-2">
            {c.phoneLead}{' '}
            <a href={telHref(site.phone)} className="link-underline font-semibold text-ink">
              {phoneLabel(site)}
            </a>
          </p>
          <p className="mt-12 border-t border-line pt-6 text-sm text-ink-2">{c.asOf}</p>
        </div>
      </article>
    </>
  )
}
