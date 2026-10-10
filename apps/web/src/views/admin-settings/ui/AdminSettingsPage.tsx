'use client'

import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import { settingsQuery, type SettingsKey } from '@/entities/admin-settings'
import { adminPaths } from '@/entities/session'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { useUrlState } from '@/shared/lib/hooks/useUrlState'
import { ErrorState } from '@/shared/ui/admin/EmptyState'
import { Skeleton } from '@/shared/ui/admin/Skeleton'
import { SiteLink, Topbar } from '@/shared/ui/admin/Topbar'

function FormSkeleton() {
  return (
    <div role="status" aria-label="Yuklanmoqda" className="flex flex-col gap-4">
      <Skeleton className="ml-auto h-10 w-64" />
      <Skeleton className="h-72 rounded-card" />
      <Skeleton className="h-56 rounded-card" />
    </div>
  )
}

const SettingsForm = dynamic(() => import('@/features/admin-settings-form').then((m) => m.SettingsForm), { ssr: false, loading: FormSkeleton })

const tabs: { key: SettingsKey; label: string; title: string; site: string }[] = [
  { key: 'site', label: 'Aloqa va manzil', title: 'Sayt sozlamalari', site: '/uz/aloqa' },
  { key: 'home', label: 'Bosh sahifa', title: 'Bosh sahifa', site: '/uz' },
  { key: 'clinic', label: 'Klinika sahifasi', title: 'Klinika sahifasi', site: '/uz/klinika' },
]
const KEYS = ['tab'] as const

/**
 * Sozlamalar: tablar — oddiy havolalar (?tab=…), shuning uchun saqlanmagan o‘zgarish bo‘lsa
 * useUnsavedChangesGuard tasdiq so‘raydi. GET'dagi yechilgan Media PUT'dan oldin olib tashlanadi (forma payload'i).
 */
export function AdminSettingsPage() {
  const [url] = useUrlState(KEYS)
  const tab = tabs.find((t) => t.key === url.tab) ?? tabs[0]!
  const q = useQuery(settingsQuery(tab.key))

  return (
    <>
      <Topbar title={tab.title}>
        <SiteLink href={tab.site} className="max-sm:hidden" />
      </Topbar>
      <main id="admin-main" className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-8 pt-6 max-md:px-4 max-md:pt-4">
        <nav aria-label="Sozlamalar bo‘limlari" className="am-hs flex h-11 shrink-0 gap-1 overflow-x-auto border-b border-line">
          {tabs.map((t) => {
            const on = t.key === tab.key
            return (
              <Link
                key={t.key}
                href={t.key === 'site' ? adminPaths.settings : `${adminPaths.settings}?tab=${t.key}`}
                aria-current={on ? 'page' : undefined}
                className={`-mb-px flex shrink-0 items-center border-b-2 px-4 text-sm whitespace-nowrap ${on ? 'border-navy font-semibold text-navy' : 'border-transparent font-medium text-ink-2 hover:text-ink'}`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
        <div className="max-w-[960px] pb-6">
          {q.isPending ? <FormSkeleton /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> : <SettingsForm key={tab.key} settingsKey={tab.key} value={q.data} />}
        </div>
      </main>
    </>
  )
}
