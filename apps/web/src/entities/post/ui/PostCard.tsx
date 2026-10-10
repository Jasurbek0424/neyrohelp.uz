import Link from 'next/link'

import { postPath } from '@/shared/config/routes'
import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { formatDate } from '@/shared/lib/format'
import { Photo } from '@/shared/ui/Photo'

import type { PostCardData } from '../model/types'

export function PostCard({ post, locale, t, headingLevel = 3 }: { post: PostCardData; locale: Locale; t: Dictionary; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <Link href={postPath(locale, post.slug)} className="group flex flex-col">
      <Photo media={post.cover} className="aspect-[16/10]" sizes="(min-width: 1440px) 410px, (min-width: 768px) 33vw, 100vw" zoom />
      <div className="mt-5 flex flex-wrap gap-3 text-[13px] text-ink-2">
        <span className="font-semibold text-navy">{post.category.title}</span>
        {post.reading_minutes ? (
          <span>
            {post.reading_minutes} {t.common.readTime}
          </span>
        ) : null}
        {post.published_at ? <time dateTime={post.published_at}>{formatDate(post.published_at, locale)}</time> : null}
      </div>
      <H className="mt-2.5 text-[22px] leading-snug font-semibold tracking-[-0.015em] text-balance group-hover:text-navy">{post.title}</H>
      <p className="mt-2.5 line-clamp-2 text-base leading-relaxed text-ink-2">{post.excerpt}</p>
    </Link>
  )
}
