'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { useMe } from '@/widgets/admin-shell'
import { CreateUserDialog, UserRoleSelect, UserRowActions } from '@/features/admin-user-manage'
import { auditQuery, usersQuery, type AdminUser } from '@/entities/admin-user'
import { UserAvatar } from '@/entities/session'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { relativeDayTime } from '@/shared/lib/admin/time'
import { useNow } from '@/shared/lib/hooks/useNow'
import { useUrlState } from '@/shared/lib/hooks/useUrlState'
import { AdminButton } from '@/shared/ui/admin/Button'
import { EmptyState, ErrorState } from '@/shared/ui/admin/EmptyState'
import { PlusIcon } from '@/shared/ui/admin/icons'
import { Pagination } from '@/shared/ui/admin/Pagination'
import { SkeletonRows } from '@/shared/ui/admin/Skeleton'
import { StatusTag } from '@/shared/ui/admin/StatusTag'
import { Topbar } from '@/shared/ui/admin/Topbar'

const th = 'border-b border-line px-3 font-medium first:pl-4 last:pr-4'
const td = 'border-b border-line px-3 first:pl-4 last:pr-4'

function UserState({ u, now }: { u: AdminUser; now: number }) {
  if (!u.is_active) return <StatusTag tone="neutral">Bloklangan</StatusTag>
  if (u.locked_until && new Date(u.locked_until).getTime() > now) return <StatusTag tone="warn">Vaqtincha qulflangan</StatusTag>
  return <StatusTag tone="ok">Faol</StatusTag>
}

const KEYS = ['audit'] as const

/** Xodimlar (faqat admin): rol (optimistic), bloklash, sessiyalarni yopish + audit jurnali */
export function AdminUsersPage() {
  const me = useMe()
  const users = useQuery(usersQuery())
  const [url, setUrl] = useUrlState(KEYS)
  const auditPage = Math.max(1, Number(url.audit) || 1)
  const audit = useQuery(auditQuery(auditPage))
  const [create, setCreate] = useState(false)
  const now = useNow(60_000)

  return (
    <>
      <Topbar title="Xodimlar">
        <AdminButton variant="primary" onClick={() => setCreate(true)}>
          <PlusIcon />
          Xodim qo‘shish
        </AdminButton>
      </Topbar>
      <main id="admin-main" className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-8 py-7 max-md:px-4 max-md:py-4">
        <section aria-labelledby="users-title" className="overflow-x-auto rounded-card border border-line bg-white">
          <h2 id="users-title" className="sr-only">
            Xodimlar ro‘yxati
          </h2>
          {users.isPending ? (
            <SkeletonRows rows={4} />
          ) : users.isError ? (
            <ErrorState message={errorMessage(users.error)} onRetry={() => users.refetch()} />
          ) : !users.data.length ? (
            <EmptyState title="Xodim yo‘q" />
          ) : (
            <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
              <thead className="bg-(--am-bg) text-left text-xs text-ink-2">
                <tr className="h-10">
                  <th scope="col" className={th}>
                    Xodim
                  </th>
                  <th scope="col" className={`${th} w-[200px]`}>
                    Rol
                  </th>
                  <th scope="col" className={`${th} w-[110px]`}>
                    2FA
                  </th>
                  <th scope="col" className={`${th} w-[150px]`}>
                    Oxirgi kirish
                  </th>
                  <th scope="col" className={`${th} w-[160px]`}>
                    Holat
                  </th>
                  <th scope="col" className={`${th} w-[250px] text-right`}>
                    <span className="sr-only">Amallar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.data.map((u) => {
                  const self = u.id === me.id
                  return (
                    <tr key={u.id} className="am-row h-16">
                      <td className={td}>
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar name={u.name} />
                          <div className="min-w-0">
                            <div className="truncate font-semibold">
                              {u.name}
                              {self && <span className="ml-1.5 text-xs font-medium text-ink-2">(siz)</span>}
                            </div>
                            <div className="truncate text-[13px] text-ink-2">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className={td}>
                        <UserRoleSelect user={u} disabled={self} />
                      </td>
                      <td className={td}>{u.totp_enabled ? <StatusTag tone="ok">Yoqilgan</StatusTag> : <StatusTag tone={u.role === 'operator' ? 'neutral' : 'warn'}>Yo‘q</StatusTag>}</td>
                      <td className={`${td} text-[13px] text-ink-2 tabular-nums`}>{u.last_login_at ? relativeDayTime(u.last_login_at) : 'Hali kirmagan'}</td>
                      <td className={td}>
                        <UserState u={u} now={now} />
                      </td>
                      <td className={td}>
                        <UserRowActions user={u} isSelf={self} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        <section aria-labelledby="audit-title" className="overflow-x-auto rounded-card border border-line bg-white">
          <div className="flex h-14 items-center justify-between px-4">
            <h2 id="audit-title" className="m-0 text-base font-semibold">
              Audit jurnali
            </h2>
            <span className="text-xs text-ink-2">Kirishlar, rol o‘zgarishi, eksport, o‘chirish, narxlar</span>
          </div>
          {audit.isPending ? (
            <SkeletonRows rows={5} height={44} />
          ) : audit.isError ? (
            <ErrorState message={errorMessage(audit.error)} onRetry={() => audit.refetch()} />
          ) : !audit.data.items.length ? (
            <EmptyState title="Hozircha yozuv yo‘q" />
          ) : (
            <table className="w-full min-w-[760px] table-fixed border-collapse text-sm" aria-busy={audit.isFetching}>
              <thead className="bg-(--am-bg) text-left text-xs text-ink-2">
                <tr className="h-10">
                  <th scope="col" className={`${th} w-[150px]`}>
                    Vaqt
                  </th>
                  <th scope="col" className={`${th} w-[180px]`}>
                    Xodim
                  </th>
                  <th scope="col" className={th}>
                    Amal
                  </th>
                  <th scope="col" className={`${th} w-[180px]`}>
                    Obyekt
                  </th>
                  <th scope="col" className={`${th} w-[140px]`}>
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {audit.data.items.map((a) => (
                  <tr key={a.id} className="h-11">
                    <td className={`${td} text-[13px] text-ink-2 tabular-nums`}>{relativeDayTime(a.created_at)}</td>
                    <td className={`${td} truncate`}>{a.user_name ?? '—'}</td>
                    <td className={`${td} truncate font-mono text-[13px]`}>{a.action}</td>
                    <td className={`${td} truncate text-[13px] text-ink-2`}>{a.entity ? `${a.entity}${a.entity_id ? ` #${a.entity_id}` : ''}` : '—'}</td>
                    <td className={`${td} text-[13px] text-ink-2 tabular-nums`}>{a.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {audit.data && audit.data.pages > 1 && (
            <div className="flex h-[52px] items-center justify-end px-4">
              <Pagination page={auditPage} pages={audit.data.pages} onChange={(p) => setUrl({ audit: p === 1 ? null : p })} />
            </div>
          )}
        </section>
      </main>
      <CreateUserDialog open={create} onClose={() => setCreate(false)} />
    </>
  )
}
