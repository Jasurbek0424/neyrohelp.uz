import type { Dictionary } from '@/shared/i18n/dictionaries/uz'

import type { Audience } from '../model/types'

export const audienceLabel = (audience: Audience, t: Dictionary) =>
  audience === 'children' ? t.common.children : audience === 'all' ? t.common.adultsAndChildren : t.common.adults
