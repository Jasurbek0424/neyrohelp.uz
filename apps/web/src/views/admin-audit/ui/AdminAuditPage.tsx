'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Link from 'next/link'

import { auditQuery, usersQuery, type AuditEntry, type AuditFilters, type AuditGroup } from '@/entities/admin-user'
import { leadStatusMeta, isLeadStatus } from '@/entities/lead'
import { adminPaths, roleLabels } from '@/entities/session'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { addDays, isoDay, tzParts } from '@/shared/lib/admin/time'
import { useUrlState } from '@/shared/lib/hooks/useUrlState'
import { AdminButton } from '@/shared/ui/admin/Button'
import { EmptyState, ErrorState } from '@/shared/ui/admin/EmptyState'
import { Input, Select } from '@/shared/ui/admin/Field'
import { Pagination } from '@/shared/ui/admin/Pagination'
import { SkeletonRows } from '@/shared/ui/admin/Skeleton'
import { StatusTag } from '@/shared/ui/admin/StatusTag'
import { Topbar } from '@/shared/ui/admin/Topbar'

const th = 'border-b border-line px-3 font-medium first:pl-4 last:pr-4'
const td = 'border-b border-line px-3 py-2.5 align-top first:pl-4 last:pr-4'
const pad = (n: number) => String(n).padStart(2, '0')

const groups: { value: AuditGroup; label: string }[] = [
  { value: 'leads', label: 'Arizalar' },
  { value: 'auth', label: 'Kirish / chiqish' },
  { value: 'prices', label: 'Narxlar' },
  { value: 'content', label: 'Kontent' },
  { value: 'users', label: 'Xodimlar' },
]

const actionLabels: Record<string, string> = {
  login_success: 'Tizimga kirdi',
  login_failed: 'Kirishda xato',
  logout: 'Tizimdan chiqdi',
  refresh_reuse: 'Shubhali sessiya bekor qilindi',
  password_changed: 'O‘z parolini o‘zgartirdi',
  password_change_failed: 'Parol o‘zgartirishda xato',
  lead_take: 'Arizani oldi',
  lead_status: 'Ariza statusini o‘zgartirdi',
  lead_note: 'Arizaga izoh yozdi',
  leads_export: 'Arizalarni Excel’ga yukladi',
  price_change: 'Narxni o‘zgartirdi',
  user_create: 'Xodim qo‘shdi',
  user_update: 'Xodim ma’lumotini o‘zgartirdi',
  role_change: 'Xodim rolini o‘zgartirdi',
  password_reset: 'Xodimga yangi parol berdi',
  sessions_revoked: 'Xodim sessiyalarini yopdi',
  doctor_delete: 'Shifokorni o‘chirdi',
  media_delete: 'Faylni o‘chirdi',
  post_delete: 'Maqolani o‘chirdi',
  post_category_delete: 'Maqola kategoriyasini o‘chirdi',
  service_delete: 'Xizmatni o‘chirdi',
  specialty_delete: 'Mutaxassislikni o‘chirdi',
  settings_update: 'Sayt sozlamalarini o‘zgartirdi',
}

const reasons: Record<string, string> = { invalid_credentials: 'noto‘g‘ri parol', locked: 'hisob bloklangan', invalid_totp: 'noto‘g‘ri kod' }

function statusText(v: unknown): string {
  return typeof v === 'string' && isLeadStatus(v) ? leadStatusMeta[v].label : String(v ?? '')
}

function stamp(value: string): string {
  const p = tzParts(value)
  return `${pad(p.d)}.${pad(p.m)}.${p.y} ${p.hh}:${p.mm}`
}

/** Jurnal yozuvining odam o‘qiydigan tafsiloti */
function Details({ a }: { a: AuditEntry }) {
  const m = a.meta as Record<string, unknown>
  const via = m.via === 'telegram' ? ' · Telegram orqali' : ''
  if (a.entity === 'lead' && a.entity_id) {
    const link = (
      <Link href={adminPaths.lead(a.entity_id)} className="am-link font-medium text-ink">
        Ariza #{a.entity_id}
      </Link>
    )
    if (a.action === 'lead_status')
      return (
        <>
          {link}: {statusText(m.from)} → <b className="font-semibold">{statusText(m.to)}</b>
          {via}
        </>
      )
    return (
      <>
        {link}
        {via}
      </>
    )
  }
  if (a.action === 'leads_export') return <>{String(m.rows ?? 0)} ta qator</>
  if (a.action === 'login_failed') return <>{reasons[String(m.reason)] ?? String(m.reason ?? '')}{m.locked ? ' · hisob 15 daqiqaga bloklandi' : ''}</>
  if (a.action === 'role_change' && m.role && typeof m.role === 'object') {
    const r = m.role as { old?: string; new?: string }
    return (
      <>
        {roleLabels[r.old as keyof typeof roleLabels] ?? r.old} → {roleLabels[r.new as keyof typeof roleLabels] ?? r.new}
      </>
    )
  }
  if (a.action === 'price_change' && 'old' in m) return <>{`${String(m.old ?? '—')} → ${String(m.new ?? '—')}`}</>
  if (a.entity === 'user' && a.entity_id === String(a.user_id)) return null // o‘zi haqida (kirish/chiqish)
  return a.entity ? <span className="text-ink-2">{`${a.entity}${a.entity_id ? ` #${a.entity_id}` : ''}`}</span> : null
}

const KEYS = ['page', 'user', 'group', 'from', 'to'] as const

/** Audit jurnali (faqat admin): kim, qachon, nima qildi — xodim, amal turi, sana bo‘yicha filtr */
export function AdminAuditPage() {
  const [url, setUrl] = useUrlState(KEYS)
  const users = useQuery(usersQuery())
  const filters: AuditFilters = {
    page: Math.max(1, Number(url.page) || 1),
    user_id: Number(url.user) || undefined,
    group: (groups.some((g) => g.value === url.group) ? url.group : undefined) as AuditGroup | undefined,
    date_from: /^\d{4}-\d{2}-\d{2}$/.test(url.from) ? url.from : undefined,
    date_to: /^\d{4}-\d{2}-\d{2}$/.test(url.to) ? url.to : undefined,
  }
  const audit = useQuery({ ...auditQuery(filters), placeholderData: keepPreviousData })
  const today = isoDay()
  const filtered = Boolean(filters.user_id || filters.group || filters.date_from || filters.date_to)
  const set = (patch: Partial<Record<(typeof KEYS)[number], string | null>>) => setUrl({ ...patch, page: null })

  return (
    <>
      <Topbar title="Jurnal" />
      <main id="admin-main" className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-8 py-7 max-md:px-4 max-md:py-4">
        <div role="search" aria-label="Jurnal filtrlari" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            Xodim
            <Select wrapperClassName="w-56" value={url.user} onChange={(e) => set({ user: e.target.value || null })}>
              <option value="">Hammasi</option>
              {users.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {roleLabels[u.role]}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            Amal turi
            <Select wrapperClassName="w-48" value={filters.group ?? ''} onChange={(e) => set({ group: e.target.value || null })}>
              <option value="">Hammasi</option>
              {groups.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            Sanadan
            <Input type="date" className="w-40" max={filters.date_to ?? today} value={filters.date_from ?? ''} onChange={(e) => set({ from: e.target.value || null })} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            Sanagacha
            <Input type="date" className="w-40" min={filters.date_from} max={today} value={filters.date_to ?? ''} onChange={(e) => set({ to: e.target.value || null })} />
          </label>
          <div className="flex gap-2">
            <AdminButton size="sm" onClick={() => set({ from: today, to: today })}>
              Bugun
            </AdminButton>
            <AdminButton size="sm" onClick={() => set({ from: addDays(today, -6), to: today })}>
              7 kun
            </AdminButton>
            {filtered && (
              <AdminButton size="sm" onClick={() => setUrl({ page: null, user: null, group: null, from: null, to: null })}>
                Tozalash
              </AdminButton>
            )}
          </div>
        </div>

        <section aria-label="Jurnal yozuvlari" className="overflow-x-auto rounded-card border border-line bg-white">
          {audit.isPending ? (
            <SkeletonRows rows={8} height={44} />
          ) : audit.isError ? (
            <ErrorState message={errorMessage(audit.error)} onRetry={() => audit.refetch()} />
          ) : !audit.data.items.length ? (
            <EmptyState title={filtered ? 'Bu filtr bo‘yicha yozuv yo‘q' : 'Hozircha yozuv yo‘q'} />
          ) : (
            <table className="w-full min-w-[860px] table-fixed border-collapse text-sm" aria-busy={audit.isFetching}>
              <thead className="bg-(--am-bg) text-left text-xs text-ink-2">
                <tr className="h-10">
                  <th scope="col" className={`${th} w-[150px]`}>
                    Vaqt
                  </th>
                  <th scope="col" className={`${th} w-[210px]`}>
                    Xodim
                  </th>
                  <th scope="col" className={`${th} w-[230px]`}>
                    Amal
                  </th>
                  <th scope="col" className={th}>
                    Tafsilot
                  </th>
                  <th scope="col" className={`${th} w-[130px]`}>
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {audit.data.items.map((a) => {
                  const actor = a.user_name ?? (typeof a.meta.actor === 'string' ? `${a.meta.actor} (Telegram)` : '—')
                  return (
                    <tr key={a.id}>
                      <td className={`${td} text-[13px] text-ink-2 tabular-nums`}>{stamp(a.created_at)}</td>
                      <td className={td}>
                        <div className="truncate font-medium">{actor}</div>
                        {a.user_role && <div className="text-xs text-ink-2">{roleLabels[a.user_role]}</div>}
                      </td>
                      <td className={td}>
                        {a.action === 'login_failed' || a.action === 'refresh_reuse' ? (
                          <StatusTag tone="warn">{actionLabels[a.action]}</StatusTag>
                        ) : (
                          (actionLabels[a.action] ?? a.action)
                        )}
                      </td>
                      <td className={`${td} text-[13px]`}>
                        <Details a={a} />
                      </td>
                      <td className={`${td} text-[13px] text-ink-2 tabular-nums`}>{a.ip ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {audit.data && (
            <div className="flex h-[52px] items-center justify-between px-4 text-[13px] text-ink-2">
              <span>Jami: {audit.data.total}</span>
              {audit.data.pages > 1 && <Pagination page={filters.page} pages={audit.data.pages} onChange={(p) => setUrl({ page: p === 1 ? null : p })} />}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
