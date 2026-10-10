import type { Locale } from '@/shared/i18n/config'

export const routes = {
  home: '',
  clinic: '/klinika',
  services: '/yonalishlar',
  doctors: '/shifokorlar',
  blog: '/blog',
  contacts: '/aloqa',
} as const

export type RouteKey = keyof typeof routes

export const localePath = (locale: Locale, path: string = '') => `/${locale}${path}`

export const doctorPath = (locale: Locale, slug: string) => `/${locale}${routes.doctors}/${slug}`
export const postPath = (locale: Locale, slug: string) => `/${locale}${routes.blog}/${slug}`

/** Ariza formasi har doim «Aloqa» sahifasida bor; bosh sahifada — pastda */
export const bookingPath = (locale: Locale) => `/${locale}${routes.contacts}#ariza`

