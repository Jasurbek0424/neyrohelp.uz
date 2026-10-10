import type { Role } from './types'

/**
 * Rol bo‘yicha bo‘limlar (UI darajasida yashirish; backend baribir `require_role` bilan tekshiradi).
 * admin — hammasi · editor — kontent/blog/sozlamalar (arizalar yo‘q) · operator — dashboard + arizalar.
 */
export type Section = 'dashboard' | 'leads' | 'doctors' | 'services' | 'posts' | 'settings' | 'users' | 'profile'

const access: Record<Section, Role[]> = {
  dashboard: ['admin', 'editor', 'operator'],
  leads: ['admin', 'operator'],
  doctors: ['admin', 'editor'],
  services: ['admin', 'editor'],
  posts: ['admin', 'editor'],
  settings: ['admin', 'editor'],
  users: ['admin'],
  profile: ['admin', 'editor', 'operator'],
}

export const canAccess = (role: Role | undefined, section: Section) => Boolean(role && access[section].includes(role))
export const canExportLeads = (role: Role | undefined) => role === 'admin'

const prefixes: [string, Section][] = [
  ['/admin/arizalar', 'leads'],
  ['/admin/shifokorlar', 'doctors'],
  ['/admin/xizmatlar', 'services'],
  ['/admin/maqolalar', 'posts'],
  ['/admin/sozlamalar', 'settings'],
  ['/admin/xodimlar', 'users'],
  ['/admin/profil', 'profile'],
]

export function sectionForPath(pathname: string): Section | null {
  if (pathname === '/admin' || pathname === '/admin/') return 'dashboard'
  for (const [p, s] of prefixes) if (pathname === p || pathname.startsWith(`${p}/`)) return s
  return null
}

export const adminPaths = {
  login: '/admin/login',
  dashboard: '/admin',
  leads: '/admin/arizalar',
  lead: (id: number | string) => `/admin/arizalar/${id}`,
  doctors: '/admin/shifokorlar',
  doctor: (id: number | string) => `/admin/shifokorlar/${id}`,
  doctorNew: '/admin/shifokorlar/yangi',
  services: '/admin/xizmatlar',
  posts: '/admin/maqolalar',
  post: (id: number | string) => `/admin/maqolalar/${id}`,
  postNew: '/admin/maqolalar/yangi',
  settings: '/admin/sozlamalar',
  users: '/admin/xodimlar',
  profile: '/admin/profil',
} as const

/** Panel ichidagi joriy yo‘l `href` ga tegishlimi (bosh panel — faqat aniq moslik, aks holda hamma yo‘l mos keladi) */
export function isActivePath(pathname: string, href: string): boolean {
  const path = href.split('?')[0]!
  if (path === adminPaths.dashboard) return pathname === path || pathname === `${path}/`
  return pathname === path || pathname.startsWith(`${path}/`)
}

/** Kirishdan keyin `next` bo‘lmasa — rolga mos boshlang‘ich sahifa */
export const homePathFor = (role: Role) => (role === 'operator' ? adminPaths.leads : adminPaths.dashboard)

/** Ochiq redirect'dan himoya: faqat /admin/... ichidagi yo‘llar */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/admin') || next.startsWith('//') || next.startsWith(adminPaths.login)) return null
  return next
}
