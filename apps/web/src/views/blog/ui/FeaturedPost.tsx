import Link from 'next/link'

import type { PostCardData } from '@/entities/post'
import { postPath } from '@/shared/config/routes'
import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { formatDate } from '@/shared/lib/format'
import { ArrowRight } from '@/shared/ui/Icons'
import { Photo } from '@/shared/ui/Photo'

export function FeaturedPost({ post, locale, t }: { post: PostCardData; locale: Locale; t: Dictionary }) {
  const href = postPath(locale, post.slug)
  return (
    <section aria-labelledby="featured-post" className="container-site grid-site items-center gap-y-8 py-12 lg:py-16">
      <Link href={href} tabIndex={-1} aria-hidden className="col-span-4 lg:col-span-7">
        <Photo media={post.cover} className="aspect-[16/10]" sizes="(min-width: 1440px) 740px, (min-width: 1024px) 58vw, 100vw" priority />
      </Link>
      <div className="col-span-4 flex flex-col items-start lg:col-span-5 lg:pl-6">
        <p className="flex items-center gap-3 text-sm font-medium text-ink-2">
          <span aria-hidden className="h-0.5 w-6 bg-coral" />
          {t.blog.featured}
        </p>
        <p className="mt-6 text-[13px] text-ink-2">
          <span className="font-semibold text-navy">{post.category.title}</span>
          {post.published_at ? (
            <>
              {' · '}
              <time dateTime={post.published_at}>{formatDate(post.published_at, locale)}</time>
            </>
          ) : null}
        </p>
        <h2 id="featured-post" className="mt-3 text-[clamp(1.875rem,1.4rem+1.2vw,2.5rem)] leading-[1.1] font-semibold tracking-[-0.03em] text-balance">
          <Link href={href} className="hover:text-navy">
            {post.title}
          </Link>
        </h2>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{post.excerpt}</p>
        {post.author ? (
          <p className="mt-6 text-[15px]">
            <span className="font-semibold">{post.author.full_name}</span>
            {post.author.specialty ? <span className="text-ink-2">{`, ${post.author.specialty}`}</span> : null}
          </p>
        ) : null}
        <Link href={href} className="link-underline mt-7 inline-flex items-center gap-2 font-medium">
          {t.blog.read}
          <span className="sr-only">: {post.title}</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  )
}
