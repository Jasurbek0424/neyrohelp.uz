import type { Metadata } from 'next'

import { getAllPosts, getPostCategories, PostCard } from '@/entities/post'
import { getSite, telegramHandle } from '@/entities/settings'
import { BlogFilter } from '@/features/blog-filter'
import { localePath, routes } from '@/shared/config/routes'
import { getDictionary } from '@/shared/i18n'
import { localeFrom } from '@/shared/i18n/params'
import { pageMetadata } from '@/shared/lib/seo'
import { ButtonLink } from '@/shared/ui/Button'
import { PageHero } from '@/widgets/page-hero'

import { FeaturedPost } from './FeaturedPost'

type Props = { params: Promise<{ locale: string }> }

const PAGE_SIZE = 9

/** Kanonik — /blog (filtr/qidiruv/sahifa variantlari brauzerda, alohida indekslanmaydi) */
export async function generateBlogMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)
  return pageMetadata({ locale, path: routes.blog, title: t.blog.title, description: t.blog.lead })
}

/**
 * Statik sahifa (ISR, teg: posts): barcha maqolalar server'da render qilinadi,
 * kategoriya / qidiruv / sahifalash brauzerda (features/blog-filter).
 */
export async function BlogPage({ params }: Props) {
  const locale = await localeFrom(params)
  const t = getDictionary(locale)
  const [site, categories, posts] = await Promise.all([getSite(locale), getPostCategories(locale), getAllPosts(locale)])
  const featured = posts.find((p) => p.featured) ?? null

  const basePath = localePath(locale, routes.blog)
  const tg = telegramHandle(site)

  return (
    <>
      <PageHero
        crumbs={[{ href: localePath(locale), label: t.nav.home }, { href: basePath, label: t.nav.blog }]}
        crumbsLabel={t.common.breadcrumb}
        title={t.blog.title}
        lead={t.blog.lead}
        divider={false}
      />

      <BlogFilter
        basePath={basePath}
        categories={categories.map((c) => ({ slug: c.slug, title: c.title }))}
        featured={featured ? { key: featured.id, node: <FeaturedPost post={featured} locale={locale} t={t} /> } : null}
        items={posts.map((p) => ({
          key: p.id,
          category: p.category.slug,
          text: `${p.title} ${p.excerpt ?? ''} ${p.category.title}`,
          node: <PostCard post={p} locale={locale} t={t} headingLevel={featured ? 3 : 2} />,
        }))}
        pageSize={PAGE_SIZE}
        labels={{
          all: t.common.all,
          nav: t.nav.blog,
          list: t.blog.title,
          search: t.blog.search,
          searchPlaceholder: t.blog.searchPlaceholder,
          empty: t.blog.empty,
          pagination: t.blog.pagination,
          prev: t.common.prev,
          next: t.common.next,
        }}
      />

      {tg ? (
        <section aria-labelledby="blog-telegram" className="bg-navy py-14 text-white lg:py-18">
          <div className="container-site flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h2 id="blog-telegram" className="text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-tight font-semibold tracking-[-0.02em] text-balance">
                {t.blog.telegramTitle}
              </h2>
              <p className="mt-3 text-[17px] leading-relaxed text-mist">{t.blog.telegramText}</p>
            </div>
            <ButtonLink href={tg.href} variant="white" target="_blank" rel="noopener noreferrer">
              {t.blog.telegramCta}
            </ButtonLink>
          </div>
        </section>
      ) : null}
    </>
  )
}
