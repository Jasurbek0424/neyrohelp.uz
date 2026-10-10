import 'server-only'

import { apiGet, tags } from '@/shared/api/server'
import type { Locale } from '@/shared/i18n/config'

import type { ServiceGroup } from '../model/types'

export async function getServiceGroups(locale: Locale): Promise<ServiceGroup[]> {
  return (await apiGet<ServiceGroup[]>('/public/services', { locale, tags: [tags.services] })) ?? []
}
