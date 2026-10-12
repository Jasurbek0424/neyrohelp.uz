import Link from 'next/link'

import { PostCard, type PostCardData } from '@/entities/post'
import { localePath, routes } from '@/shared/config/routes'
import type { Locale } from '@/shared/i18n/config'
import type { Dictionary } from '@/shared/i18n/dictionaries/uz'
import { SectionHeader } from '@/shared/ui/Section'

/** Maqolalar to‘ri: bosh sahifada (yorliq + sarlavha) va maqola ostida «O‘xshash maqolalar» */
export function BlogGrid({ locale, t, posts, variant = 'home' }: { locale: Locale; t: Dictionary; posts: PostCardData[]; variant?: 'home' | 'related' }) {
  if (!posts.length) return null
  const id = variant === 'home' ? 'home-blog' : 'post-related'
  return (
    <section className={`container-site ${variant === 'home' ? 'py-18 lg:py-28' : 'py-14 lg:py-20'}`} aria-labelledby={id}>
      {variant === 'home' ? (
        <SectionHeader
          id={id}
          label={t.home.blogLabel}
          title={t.home.blogTitle}
          aside={
            <Link href={localePath(locale, routes.blog)} className="link-underline font-medium lg:self-end">
              {t.common.allPosts}
            </Link>
          }
        />
      ) : (
        <h2 id={id} className="text-h2 font-semibold text-balance">
          {t.blog.related}
        </h2>
      )}
      <ul className={`reveal-stagger grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3 ${variant === 'home' ? 'mt-12 lg:mt-14' : 'mt-10'}`}>
        {posts.map((p) => (
          <li key={p.id}>
            <PostCard post={p} locale={locale} t={t} />
          </li>
        ))}
      </ul>
    </section>
  )
}
