import { telegramHref } from '@/shared/lib/format'

import type { Site } from '../model/types'

export const phoneLabel = (site: Pick<Site, 'phone' | 'phone_display'>) => site.phone_display || site.phone

export const telegramHandle = (site: Pick<Site, 'telegram'>) => {
  const href = telegramHref(site.telegram)
  return href ? { href, label: `@${href.slice('https://t.me/'.length)}` } : null
}
