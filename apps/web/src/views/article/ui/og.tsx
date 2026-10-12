import { getPost } from '@/entities/post'
import { isLocale } from '@/shared/i18n/config'
import { SITE_URL } from '@/shared/config/env'
import { renderOgImage } from '@/shared/lib/og'

export async function articleOgImage(params: Promise<{ locale: string; slug: string }>) {
  const { locale: raw, slug } = await params
  const locale = isLocale(raw) ? raw : 'uz'
  const post = await getPost(slug, locale)
  const footer = [post?.author?.full_name, SITE_URL.replace(/^https?:\/\//, '')].filter(Boolean).join(' · ')
  return renderOgImage({ eyebrow: post?.category.title ?? 'Blog', title: post?.title ?? 'NeyroHelp', footer })
}
