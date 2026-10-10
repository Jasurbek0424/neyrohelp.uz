import { adminPaths, isActivePath, type Section } from '@/entities/session'
import type { IconName } from '@/shared/ui/admin/icons'

export type NavItem = { key: string; label: string; href: string; icon: IconName; section: Section; badge?: 'leads' }
export type NavGroup = { label: string; items: NavItem[] }

/** AdminSidebar.dc.html dagi tartib (ekrani bor bo‘limlar) */
export const navGroups: NavGroup[] = [
  {
    label: 'Asosiy',
    items: [
      { key: 'dashboard', label: 'Bosh panel', href: adminPaths.dashboard, icon: 'dashboard', section: 'dashboard' },
      { key: 'leads', label: 'Arizalar', href: adminPaths.leads, icon: 'leads', section: 'leads', badge: 'leads' },
    ],
  },
  {
    label: 'Kontent',
    items: [
      { key: 'doctors', label: 'Shifokorlar', href: adminPaths.doctors, icon: 'doctors', section: 'doctors' },
      { key: 'services', label: 'Xizmatlar va narxlar', href: adminPaths.services, icon: 'services', section: 'services' },
    ],
  },
  { label: 'Blog', items: [{ key: 'posts', label: 'Maqolalar', href: adminPaths.posts, icon: 'posts', section: 'posts' }] },
  {
    label: 'Sahifalar',
    items: [
      { key: 'home', label: 'Bosh sahifa', href: `${adminPaths.settings}?tab=home`, icon: 'home', section: 'settings' },
      { key: 'clinic', label: 'Klinika sahifasi', href: `${adminPaths.settings}?tab=clinic`, icon: 'clinic', section: 'settings' },
    ],
  },
  {
    label: 'Tizim',
    items: [
      { key: 'settings', label: 'Sayt sozlamalari', href: adminPaths.settings, icon: 'settings', section: 'settings' },
      { key: 'users', label: 'Xodimlar', href: adminPaths.users, icon: 'users', section: 'users' },
      { key: 'audit', label: 'Jurnal', href: adminPaths.audit, icon: 'clock', section: 'audit' },
    ],
  },
]

/** Joriy URL bo‘yicha faol menyu bandi */
export function activeKey(pathname: string, tab: string | null): string | null {
  if (pathname.startsWith(adminPaths.settings)) return tab === 'home' ? 'home' : tab === 'clinic' ? 'clinic' : 'settings'
  for (const g of navGroups) for (const i of g.items) if (isActivePath(pathname, i.href)) return i.key
  return null
}
