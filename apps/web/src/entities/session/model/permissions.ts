import type { Role } from './types'

/**
 * Rol bo‘yicha bo‘limlar (UI darajasida yashirish; backend baribir `require_role` bilan tekshiradi).
 * admin — hammasi · editor — kontent/blog/sozlamalar (arizalar yo‘q) · operator — dashboard + arizalar.
 */
export type Section = 'dashboard' | 'leads' | 'doctors' | 'services' | 'posts' | 'settings' | 'users' | 'audit' | 'profile'

const access: Record<Section, Role[]> = {
  dashboard: ['admin', 'editor', 'operator'],
  leads: ['admin', 'operator'],
  doctors: ['admin', 'editor'],
  services: ['admin', 'editor'],
  posts: ['admin', 'editor'],
  settings: ['admin', 'editor'],
  users: ['admin'],
  audit: ['admin'],
  profile: ['admin', 'editor', 'operator'],
}

export const canAccess = (role: Role | undefined, section: Section) => Boolean(role && access[section].includes(role))
export const canExportLeads = (role: Role | undefined) => role === 'admin'

const prefixes: [string, Section][] = [
  ['/secret-admin/arizalar', 'leads'],
  ['/secret-admin/shifokorlar', 'doctors'],
  ['/secret-admin/xizmatlar', 'services'],
  ['/secret-admin/maqolalar', 'posts'],
  ['/secret-admin/sozlamalar', 'settings'],
  ['/secret-admin/xodimlar', 'users'],
  ['/secret-admin/jurnal', 'audit'],
  ['/secret-admin/profil', 'profile'],
]

export function sectionForPath(pathname: string): Section | null {
  if (pathname === '/secret-admin' || pathname === '/secret-admin/') return 'dashboard'
  for (const [p, s] of prefixes) if (pathname === p || pathname.startsWith(`${p}/`)) return s
  return null
}

export const adminPaths = {
  login: '/secret-admin/login',
  dashboard: '/secret-admin',
  leads: '/secret-admin/arizalar',
  lead: (id: number | string) => `/secret-admin/arizalar/${id}`,
  doctors: '/secret-admin/shifokorlar',
  doctor: (id: number | string) => `/secret-admin/shifokorlar/${id}`,
  doctorNew: '/secret-admin/shifokorlar/yangi',
  services: '/secret-admin/xizmatlar',
  posts: '/secret-admin/maqolalar',
  post: (id: number | string) => `/secret-admin/maqolalar/${id}`,
  postNew: '/secret-admin/maqolalar/yangi',
  settings: '/secret-admin/sozlamalar',
  users: '/secret-admin/xodimlar',
  audit: '/secret-admin/jurnal',
  profile: '/secret-admin/profil',
} as const

/** Panel ichidagi joriy yo‘l `href` ga tegishlimi (bosh panel — faqat aniq moslik, aks holda hamma yo‘l mos keladi) */
export function isActivePath(pathname: string, href: string): boolean {
  const path = href.split('?')[0]!
  if (path === adminPaths.dashboard) return pathname === path || pathname === `${path}/`
  return pathname === path || pathname.startsWith(`${path}/`)
}

/** Kirishdan keyin `next` bo‘lmasa — rolga mos boshlang‘ich sahifa */
export const homePathFor = (role: Role) => (role === 'operator' ? adminPaths.leads : adminPaths.dashboard)

/** Ochiq redirect'dan himoya: faqat /secret-admin/... ichidagi yo‘llar */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/secret-admin') || next.startsWith('//') || next.startsWith(adminPaths.login)) return null
  return next
}
