import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AuthorAvatar, getPost, getPostLocales, getPosts, type Post, type PostCardData } from '@/entities/post'
import { getSitemapIndex } from '@/entities/page'
import { CLINIC_ID } from '@/entities/settings'
import { PostShare } from '@/features/post-share'
import { bookingPath, doctorPath, localePath, postPath, routes } from '@/shared/config/routes'
import { getDictionary, type Locale } from '@/shared/i18n'
import { localeFrom } from '@/shared/i18n/params'
import { formatDate } from '@/shared/lib/format'
import { renderMarkdown } from '@/shared/lib/markdown'
import { absoluteUrl, mediaUrl, pageMetadata, SITE_NAME } from '@/shared/lib/seo'
import { ButtonLink } from '@/shared/ui/Button'
import { JsonLd } from '@/shared/ui/JsonLd'
import { Photo } from '@/shared/ui/Photo'
import { SectionLabel } from '@/shared/ui/Section'
import { BlogGrid } from '@/widgets/blog-grid'
import { Breadcrumbs } from '@/widgets/page-hero'

type Props = { params: Promise<{ locale: string; slug: string }> }

/** Build vaqtida barcha maqolalar (API /public/sitemap); yangilari birinchi so‘rovda (dynamicParams) */
export async function articleStaticParams() {
  const { posts } = await getSitemapIndex()
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateArticleMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params)
  const { slug } = await params
  const post = await getPost(slug, locale)
  if (!post) return {}
  const available = await getPostLocales(post.slug)
  // Tarjimasi yo‘q til versiyasi: indekslanmaydi, kanonik — uz (asl) versiya
  const untranslated = locale !== 'uz' && !post.translated
  return pageMetadata({
    locale,
    path: `${routes.blog}/${post.slug}`,
    title: post.seo.title || post.title,
    description: post.seo.description || post.excerpt,
    image: post.cover,
    type: 'article',
    available,
    canonicalLocale: untranslated ? 'uz' : locale,
    noindex: untranslated,
    publishedTime: post.published_at,
    modifiedTime: post.updated_at,
    authors: post.author ? [absoluteUrl(doctorPath(locale, post.author.slug))] : undefined,
  })
}

async function getRelated(locale: Locale, post: Post): Promise<PostCardData[]> {
  const same = (await getPosts(locale, { category: post.category.slug, exclude: post.id, limit: 3 })).items
  if (same.length >= 3) return same
  const have = new Set(same.map((p) => p.id))
  const others = (await getPosts(locale, { exclude: post.id, limit: 6 })).items.filter((p) => !have.has(p.id))
  return [...same, ...others].slice(0, 3)
}

export async function ArticlePage({ params }: Props) {
  const locale = await localeFrom(params)
  const { slug } = await params
  const t = getDictionary(locale)
  const post = await getPost(slug, locale)
  if (!post) notFound()

  const { html, toc } = renderMarkdown(post.body)
  const related = await getRelated(locale, post)
  const author = post.author
  const url = absoluteUrl(postPath(locale, post.slug))
  const blogPath = localePath(locale, routes.blog)
  const contentLocale: Locale = post.translated ? locale : 'uz'

  return (
    <article lang={contentLocale !== locale ? 'uz-Latn' : undefined}>
      <header className="container-site pt-10 lg:pt-16">
        <Breadcrumbs
          label={t.common.breadcrumb}
          items={[
            { href: localePath(locale), label: t.nav.home },
            { href: blogPath, label: t.nav.blog },
            { href: `${blogPath}?kategoriya=${encodeURIComponent(post.category.slug)}`, label: post.category.title },
          ]}
          linkLast
          tail={{ href: postPath(locale, post.slug), label: post.title }}
        />
        <div className="grid-site mt-8">
          <div className="col-span-4 lg:col-span-8 lg:col-start-3">
            <span className="inline-block rounded bg-navy-soft px-2.5 py-1 text-[13px] font-medium text-navy">{post.category.title}</span>
            <h1 className="mt-5 text-[clamp(2.25rem,1.6rem+2.2vw,3.25rem)] leading-[1.06] font-semibold tracking-[-0.035em] text-balance">{post.title}</h1>
            {post.excerpt ? <p className="mt-6 text-[clamp(1.125rem,1rem+0.4vw,1.3125rem)] leading-relaxed text-ink-2">{post.excerpt}</p> : null}

            <div className="mt-8 flex flex-col gap-5 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                {author ? <AuthorAvatar author={author} /> : null}
                <p className="text-[15px] leading-snug">
                  {author ? (
                    <span className="block">
                      <span className="font-semibold">{author.full_name}</span>
                      {author.specialty ? <span className="text-ink-2">{`, ${author.specialty}`}</span> : null}
                    </span>
                  ) : null}
                  <span className="block text-ink-2">
                    {post.published_at ? <time dateTime={post.published_at}>{formatDate(post.published_at, locale)}</time> : null}
                    {post.reading_minutes ? ` · ${post.reading_minutes} ${t.common.readTime}` : ''}
                  </span>
                </p>
              </div>
              <PostShare
                url={url}
                title={post.title}
                labels={{ share: t.blog.share, telegram: t.common.telegram, copy: t.blog.copyLink, copied: t.blog.copied }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="container-site mt-10 lg:mt-12">
        <Photo media={post.cover} className="aspect-[16/9]" sizes="(min-width: 1440px) 1280px, 100vw" priority />
      </div>

      <div className="container-site grid-site gap-y-10 py-12 lg:py-18">
        {toc.length ? (
          <nav
            aria-labelledby="toc-title"
            className="col-span-4 border-y border-line py-5 lg:sticky lg:top-28 lg:col-span-3 lg:row-start-1 lg:self-start lg:border-y-0 lg:py-0 lg:pr-6"
          >
            <h2 id="toc-title" className="text-sm font-semibold">
              {t.blog.toc}
            </h2>
            <ol className="mt-4 flex flex-col gap-3 text-[15px] leading-snug">
              {toc.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-ink-2 hover:text-navy">
                    {item.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="col-span-4 lg:col-span-6 lg:col-start-4 lg:row-start-1">
          <div className="max-w-180">
            {/* Xavfsiz: markdown-it html:false + havola/rasm sxemasi tekshiruvi (shared/lib/markdown) */}
            <div className="prose-article" dangerouslySetInnerHTML={{ __html: html }} />
            <p className="mt-12 border-t border-line pt-5 text-sm leading-relaxed text-ink-2">{t.blog.disclaimer}</p>
          </div>
        </div>

        <aside aria-label={t.blog.asideTitle} className="col-span-4 lg:sticky lg:top-28 lg:col-span-3 lg:col-start-10 lg:row-start-1 lg:self-start">
          <div className="rounded-card border border-line p-6">
            <p className="text-lg leading-snug font-semibold">{t.blog.asideTitle}</p>
            <p className="mt-2.5 text-[15px] leading-relaxed text-ink-2">{t.blog.asideText}</p>
            <ButtonLink href={bookingPath(locale)} size="sm" className="mt-5">
              {t.common.book}
            </ButtonLink>
          </div>
        </aside>
      </div>

      {author ? (
        <section aria-labelledby="post-author" className="bg-sand py-14 lg:py-18">
          <div className="container-site grid-site gap-y-8">
            <div className="col-span-4 flex flex-col gap-6 sm:flex-row sm:items-start lg:col-span-8 lg:col-start-3 lg:gap-8">
              <AuthorAvatar author={author} size="lg" />
              <div>
                <SectionLabel>{t.blog.author}</SectionLabel>
                <h2 id="post-author" className="mt-4 text-2xl font-semibold tracking-[-0.02em]">
                  {author.full_name}
                </h2>
                {author.specialty ? <p className="mt-1 text-[15px] text-ink-2">{author.specialty}</p> : null}
                {author.lead ? <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-2">{author.lead}</p> : null}
                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
                  <Link href={doctorPath(locale, author.slug)} className="link-underline font-medium">
                    {t.blog.authorProfile}
                  </Link>
                  <ButtonLink href={bookingPath(locale)} size="sm">
                    {t.common.book}
                  </ButtonLink>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <BlogGrid locale={locale} t={t} posts={related} variant="related" />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'MedicalWebPage',
              '@id': `${url}#webpage`,
              url,
              name: post.title,
              description: post.excerpt,
              inLanguage: contentLocale,
              isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl(`/${locale}`) },
              lastReviewed: post.updated_at,
              reviewedBy: author ? { '@id': absoluteUrl(`${doctorPath(locale, author.slug)}#physician`) } : undefined,
              mainEntity: { '@id': `${url}#article` },
            },
            {
              '@type': 'Article',
              '@id': `${url}#article`,
              mainEntityOfPage: { '@id': `${url}#webpage` },
              headline: post.title.slice(0, 110),
              description: post.excerpt,
              articleSection: post.category.title,
              inLanguage: contentLocale,
              datePublished: post.published_at ?? post.updated_at,
              dateModified: post.updated_at,
              image: [mediaUrl(post.cover) ?? absoluteUrl(`${postPath(locale, post.slug)}/opengraph-image`)],
              wordCount: post.body.split(/\s+/).filter(Boolean).length,
              author: author
                ? {
                    '@type': 'Person',
                    name: author.full_name,
                    jobTitle: author.specialty || undefined,
                    url: absoluteUrl(doctorPath(locale, author.slug)),
                  }
                : { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl(`/${locale}`) },
              publisher: {
                '@type': 'Organization',
                '@id': CLINIC_ID,
                name: SITE_NAME,
                url: absoluteUrl(`/${locale}`),
                logo: { '@type': 'ImageObject', url: absoluteUrl('/icon.png'), width: 512, height: 512 },
              },
            },
          ],
        }}
      />
    </article>
  )
}
