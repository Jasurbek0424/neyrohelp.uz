import { Photo } from '@/shared/ui/Photo'

import type { Author } from '../model/types'

/** Muallif rasmi; rasm bo‘lmasa — bosh harf */
export function AuthorAvatar({ author, size = 'sm' }: { author: Author; size?: 'sm' | 'lg' }) {
  const box = size === 'lg' ? 'size-24' : 'size-11'
  if (author.photo?.url) {
    return <Photo media={author.photo} rounded={false} className={`${box} shrink-0 rounded-full`} sizes={size === 'lg' ? '96px' : '44px'} />
  }
  return (
    <span
      aria-hidden
      className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-navy-soft font-semibold text-navy ${size === 'lg' ? 'text-3xl' : 'text-base'}`}
    >
      {author.full_name.replace(/[^\p{L}]/gu, '').charAt(0) || 'N'}
    </span>
  )
}
