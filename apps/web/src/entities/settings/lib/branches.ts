import type { DirectionRow, Site } from '../model/types'

export type Branch = {
  name: string
  address: string
  landmark: string
  phone: string
  phone_display: string
  hours_short: string
  lat: number | null
  lng: number | null
  yandex_map_url: string | null
  google_map_url: string | null
  directions: DirectionRow[]
}

/**
 * Barcha filiallar: birinchisi — asosiy (sozlamalarning yuqori darajadagi maydonlari),
 * keyin qo‘shimchalar. Qo‘shimcha filialda telefon/ish vaqti bo‘sh bo‘lsa asosiyniki olinadi.
 */
export function siteBranches(site: Site): Branch[] {
  const main: Branch = {
    name: site.branch_name ?? '',
    address: site.address,
    landmark: site.landmark,
    phone: site.phone,
    phone_display: site.phone_display || site.phone,
    hours_short: site.hours_short,
    lat: site.lat ?? null,
    lng: site.lng ?? null,
    yandex_map_url: site.yandex_map_url ?? null,
    google_map_url: site.google_map_url ?? null,
    directions: site.directions ?? [],
  }
  const extra = (site.branches ?? []).map<Branch>((b) => ({
    name: b.name,
    address: b.address,
    landmark: b.landmark,
    phone: b.phone || main.phone,
    phone_display: b.phone ? b.phone_display || b.phone : main.phone_display,
    hours_short: b.hours_short || main.hours_short,
    lat: b.lat ?? null,
    lng: b.lng ?? null,
    yandex_map_url: b.yandex_map_url ?? null,
    google_map_url: b.google_map_url ?? null,
    directions: b.directions ?? [],
  }))
  return [main, ...extra]
}

export const hasCoords = (b: Pick<Branch, 'lat' | 'lng'>): b is Branch & { lat: number; lng: number } =>
  typeof b.lat === 'number' && typeof b.lng === 'number'
