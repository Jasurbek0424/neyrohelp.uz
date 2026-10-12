'use client'

import { useQuery } from '@tanstack/react-query'
import { usePathname, useSearchParams } from 'next/navigation'

import { LogoutButton } from '@/features/admin-logout'
import { leadCountsQuery } from '@/entities/lead'
import { adminPaths, canAccess, roleLabels, useAdminUi, UserAvatar, type Me } from '@/entities/session'
import { shortName } from '@/shared/lib/admin/format'
import { Icon } from '@/shared/ui/admin/icons'
import { LogoMark } from '@/shared/ui/Logo'

import { activeKey, navGroups } from '../model/nav'
import { HoverLink } from './HoverLink'

export function AdminSidebar({ me }: { me: Me }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const collapsed = useAdminUi((s) => s.sidebarCollapsed)
  const toggle = useAdminUi((s) => s.toggleSidebar)
  const showLeads = canAccess(me.role, 'leads')
  // 2FA o‘rnatilmagan bo‘lsa backend 403 qaytaradi — so‘rov yubormaymiz
  const counts = useQuery({ ...leadCountsQuery(), enabled: showLeads && !me.totp_required })
  const current = activeKey(pathname, params.get('tab'))
  const newCount = counts.data?.new ?? 0

  return (
    <aside
      aria-label="Yon panel"
      style={{ width: collapsed ? 64 : 248 }}
      className="flex h-dvh shrink-0 flex-col border-r border-line bg-white text-ink max-md:hidden"
    >
      <div className={`flex h-16 shrink-0 items-center border-b border-line ${collapsed ? 'justify-center px-0' : 'justify-between px-5'}`}>
        <HoverLink href={adminPaths.dashboard} aria-label="NeyroHelp — bosh panel" className="flex items-center gap-2.5 text-ink">
          <LogoMark size={28} />
          {!collapsed && (
            <span className="text-[17px] font-semibold tracking-[-0.02em]">
              Neyro<span className="font-normal text-navy">Help</span>
            </span>
          )}
        </HoverLink>
        {!collapsed && <span className="rounded-[4px] border border-line px-1.5 py-[3px] text-[11px] font-semibold text-ink-2">ADMIN</span>}
      </div>

      <nav aria-label="Admin menyusi" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pt-3">
        {navGroups.map((g) => {
          const items = g.items.filter((i) => canAccess(me.role, i.section))
          if (!items.length) return null
          return (
            <div key={g.label} className="flex flex-col gap-0.5">
              {collapsed ? <div aria-hidden className="mx-2.5 my-2 border-t border-line" /> : <div className="px-2.5 pt-4 pb-1.5 text-xs font-medium text-ink-2">{g.label}</div>}
              {items.map((i) => {
                const on = i.key === current
                const badge = i.badge === 'leads' && newCount > 0 ? newCount : null
                return (
                  <HoverLink
                    key={i.key}
                    href={i.href}
                    aria-current={on ? 'page' : undefined}
                    title={collapsed ? i.label : undefined}
                    aria-label={collapsed ? (badge ? `${i.label}, ${badge} ta yangi` : i.label) : undefined}
                    className={`relative flex h-9 items-center gap-2.5 rounded-control text-sm ${collapsed ? 'justify-center px-0' : 'px-2.5'} ${on ? 'bg-navy-soft font-semibold text-navy' : 'am-nav font-medium text-(--am-side-ink)'}`}
                  >
                    <Icon name={i.icon} size={18} className="shrink-0" />
                    {!collapsed && <span className="flex-1">{i.label}</span>}
                    {badge !== null &&
                      (collapsed ? (
                        <span aria-hidden className="absolute top-1.5 right-2 size-2 rounded-full bg-coral-ink" />
                      ) : (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-[4px] bg-coral-ink px-1.5 text-xs font-semibold text-white" aria-label={`${badge} ta yangi`}>
                          {badge}
                        </span>
                      ))}
                  </HoverLink>
                )
              })}
            </div>
          )
        })}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Yon panelni yoyish' : 'Yon panelni yig‘ish'}
          aria-expanded={!collapsed}
          className={`am-nav mt-auto mb-2 flex h-9 cursor-pointer items-center gap-2.5 rounded-control border-0 bg-transparent text-[13px] font-medium text-ink-2 ${collapsed ? 'justify-center' : 'px-2.5'}`}
        >
          <Icon name={collapsed ? 'expand' : 'collapse'} size={16} />
          {!collapsed && 'Panelni yig‘ish'}
        </button>
      </nav>

      <div className="border-t border-line p-3">
        <div className={`flex items-center gap-2.5 rounded-control p-2 ${collapsed ? 'flex-col px-0' : ''}`}>
          <HoverLink href={adminPaths.profile} className="flex min-w-0 flex-1 items-center gap-2.5" aria-label={collapsed ? `Profil: ${me.name}` : undefined}>
            <UserAvatar name={me.name} />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{shortName(me.name)}</span>
                <span className="block text-xs text-ink-2">{roleLabels[me.role]}</span>
              </span>
            )}
          </HoverLink>
          <LogoutButton />
        </div>
      </div>
    </aside>
  )
}
