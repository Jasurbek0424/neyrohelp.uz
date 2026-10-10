'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'

import { adminPaths, canAccess, clearClientState, homePathFor, meQueryOptions, postAuthMessage, sectionForPath, sessionKeys, subscribeAuthMessages } from '@/entities/session'
import { ApiError, setSessionExpiredHandler } from '@/shared/api/client'
import { EmptyState, ErrorState } from '@/shared/ui/admin/EmptyState'
import { Skeleton } from '@/shared/ui/admin/Skeleton'

import { AdminSidebar } from './AdminSidebar'
import { hidesTabBar, MobileTabBar } from './MobileTabBar'

function loginUrl() {
  const next = `${window.location.pathname}${window.location.search}`
  return `${adminPaths.login}?next=${encodeURIComponent(next)}`
}

function ShellSkeleton() {
  return (
    <div className="flex h-dvh" role="status" aria-label="Yuklanmoqda">
      <div className="w-[248px] border-r border-line bg-white max-md:hidden" />
      <div className="flex flex-1 flex-col">
        <div className="h-16 border-b border-line bg-white" />
        <div className="flex flex-col gap-4 p-8">
          <Skeleton className="h-8 w-72" />
          <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    </div>
  )
}

/**
 * Panel karkasi va sessiya qo‘riqchisi:
 * - `me` TanStack Query'da; 401 → /admin/login?next=…
 * - sessiya tugasa (`api()` refresh ham 401) → kesh + store'lar tozalanadi, login'ga
 * - boshqa tabda chiqilsa (BroadcastChannel) → shu tab ham tozalanadi
 * - totp_required → profilda 2FA sozlashga majburiy yo‘naltirish
 * - rol bo‘yicha bo‘lim himoyasi (UI; backend baribir tekshiradi)
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const me = useQuery(meQueryOptions())
  const section = sectionForPath(pathname)

  useEffect(() => {
    setSessionExpiredHandler(() => {
      const target = loginUrl()
      clearClientState(qc)
      postAuthMessage({ type: 'logout' })
      router.replace(target)
    })
    const unsubscribe = subscribeAuthMessages((msg) => {
      if (msg.type === 'logout') {
        clearClientState(qc)
        router.replace(adminPaths.login)
      } else {
        void qc.invalidateQueries({ queryKey: sessionKeys.all })
      }
    })
    return () => {
      setSessionExpiredHandler(() => {})
      unsubscribe()
    }
  }, [qc, router])

  const unauthenticated = me.error instanceof ApiError && me.error.status === 401
  useEffect(() => {
    if (unauthenticated) {
      clearClientState(qc)
      router.replace(loginUrl())
    }
  }, [unauthenticated, qc, router])

  const mustSetup2fa = Boolean(me.data?.totp_required && section !== 'profile')
  useEffect(() => {
    if (mustSetup2fa) router.replace(`${adminPaths.profile}?setup=2fa`)
  }, [mustSetup2fa, router])

  if (me.isPending || unauthenticated || mustSetup2fa) return <ShellSkeleton />
  if (me.isError)
    return (
      <div className="flex h-dvh items-center justify-center">
        <ErrorState
          message={
            me.error instanceof ApiError && me.error.status >= 500
              ? `Serverda xatolik (${me.error.status}). Backend terminalidagi xatoni tekshiring — ko‘pincha «uv run alembic upgrade head» yordam beradi.`
              : 'Server bilan aloqa yo‘q. Backend ishga tushganini tekshirib, qayta urinib ko‘ring.'
          }
          onRetry={() => me.refetch()}
        />
      </div>
    )

  const user = me.data
  const allowed = !section || canAccess(user.role, section)

  return (
    <div className="flex h-dvh overflow-hidden">
      <a href="#admin-main" className="sr-only z-50 rounded-control bg-navy px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Asosiy kontentga o‘tish
      </a>
      <AdminSidebar me={user} />
      <div className={`flex min-w-0 flex-1 flex-col ${hidesTabBar(pathname) ? '' : 'max-md:pb-16'}`}>
        {allowed ? (
          children
        ) : (
          <main id="admin-main" className="flex flex-1 items-center justify-center">
            <EmptyState
              title="Bu bo‘limga ruxsatingiz yo‘q"
              action={
                <Link href={homePathFor(user.role)} className="am-link text-sm font-medium">
                  Bosh sahifaga qaytish
                </Link>
              }
            >
              Rolingiz bu bo‘limni ko‘rishga ruxsat bermaydi. Kerak bo‘lsa, administratorga murojaat qiling.
            </EmptyState>
          </main>
        )}
      </div>
      <MobileTabBar me={user} />
    </div>
  )
}

/** Panel ichidagi sahifalar uchun joriy foydalanuvchi (AdminShell kafolatlaydi) */
export function useMe() {
  const { data } = useQuery(meQueryOptions())
  return data!
}
