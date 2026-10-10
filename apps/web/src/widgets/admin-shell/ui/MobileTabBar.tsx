'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { adminPaths, canAccess, isActivePath, type Me } from '@/entities/session'
import { Icon, type IconName } from '@/shared/ui/admin/icons'

/** Ariza ekrani (A8) o‘zining pastki «Saqlash» paneliga ega — tab bar ko‘rsatilmaydi */
export const hidesTabBar = (pathname: string) => /^\/admin\/arizalar\/\d+/.test(pathname)

/** Mobil pastki tab bar (A7): Arizalar · Bosh panel · Kontent · Profil */
export function MobileTabBar({ me }: { me: Me }) {
  const pathname = usePathname()
  if (hidesTabBar(pathname)) return null
  const items: { href: string; label: string; icon: IconName; match: string[] }[] = [
    ...(canAccess(me.role, 'leads') ? [{ href: adminPaths.leads, label: 'Arizalar', icon: 'leads' as const, match: [adminPaths.leads] }] : []),
    { href: adminPaths.dashboard, label: 'Bosh panel', icon: 'dashboard', match: [adminPaths.dashboard] },
    ...(canAccess(me.role, 'posts')
      ? [{ href: adminPaths.posts, label: 'Kontent', icon: 'posts' as const, match: [adminPaths.posts, adminPaths.doctors, adminPaths.services, adminPaths.settings, adminPaths.users, adminPaths.audit] }]
      : []),
    { href: adminPaths.profile, label: 'Profil', icon: 'profile', match: [adminPaths.profile] },
  ]
  return (
    <nav aria-label="Asosiy bo‘limlar" className="fixed inset-x-0 bottom-0 z-20 hidden h-16 border-t border-line bg-white max-md:flex">
      {items.map((i) => {
        const on = i.match.some((m) => isActivePath(pathname, m))
        return (
          <Link key={i.href} href={i.href} aria-current={on ? 'page' : undefined} className={`relative flex flex-1 flex-col items-center justify-center gap-1 ${on ? 'text-navy' : 'text-ink-2'}`}>
            {on && <span aria-hidden className="absolute top-0 h-0.5 w-6 bg-coral" />}
            <Icon name={i.icon} size={22} />
            <span className={`text-[11px] ${on ? 'font-semibold' : 'font-medium'}`}>{i.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
