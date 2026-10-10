'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { useLeadDrawer } from '@/features/admin-lead-drawer'
import { useLeadActions } from '@/features/admin-lead-status'
import { isLate, leadDetailQuery, leadStatusChoices, leadStatusMeta, LeadStatusTag, TelegramDelivery, type LeadPage, type LeadStatus } from '@/entities/lead'
import { UserAvatar } from '@/entities/session'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { shortName } from '@/shared/lib/admin/format'
import { leadTime } from '@/shared/lib/admin/time'
import { useNow } from '@/shared/lib/hooks/useNow'
import { formatUzPhone } from '@/shared/lib/phone'
import { AdminButton } from '@/shared/ui/admin/Button'
import { EmptyState, ErrorState } from '@/shared/ui/admin/EmptyState'
import { Select } from '@/shared/ui/admin/Field'
import { Pagination } from '@/shared/ui/admin/Pagination'
import { SkeletonRows } from '@/shared/ui/admin/Skeleton'

type Props = {
  data: LeadPage | undefined
  isPending: boolean
  isFetching: boolean
  error: unknown
  onRetry: () => void
  page: number
  pageSize: number
  onPage: (p: number) => void
  onClearFilters?: () => void
}

const WIDE = ['40px', '56px', 'auto', '148px', '120px', '150px', '176px', '112px']
const COMPACT = ['40px', '52px', 'auto', '140px', '116px', '', '', '100px']

/**
 * Arizalar jadvali (A3). Klaviatura: ↑/↓ yoki j/k — qator tanlash (panel ochiq bo‘lsa u ham ergashadi),
 * Enter — ochish, Esc — panelni yopish. Sichqoncha ustida — detal oldindan yuklanadi.
 */
export function LeadsTable({ data, isPending, isFetching, error, onRetry, page, pageSize, onPage, onClearFilters }: Props) {
  const qc = useQueryClient()
  const now = useNow(30_000)
  const open = useLeadDrawer((s) => s.open)
  const selectedId = useLeadDrawer((s) => s.selectedId)
  const select = useLeadDrawer((s) => s.select)
  const openLead = useLeadDrawer((s) => s.openLead)
  const close = useLeadDrawer((s) => s.close)
  const { setStatus, updating } = useLeadActions()
  const [checked, setChecked] = useState<Set<number>>(() => new Set())
  const body = useRef<HTMLTableSectionElement>(null)

  const items = data?.items ?? []
  const wide = !open
  const cols = wide ? WIDE : COMPACT
  const ids = items.map((r) => r.id)
  const allChecked = ids.length > 0 && ids.every((id) => checked.has(id))
  const someChecked = ids.some((id) => checked.has(id))
  const headerBox = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = someChecked && !allChecked
  }, [someChecked, allChecked])

  const prefetch = (id: number) => void qc.prefetchQuery(leadDetailQuery(id))
  const focusRow = (id: number) => requestAnimationFrame(() => body.current?.querySelector<HTMLElement>(`[data-row="${id}"]`)?.focus())

  const onKeyDown = (e: KeyboardEvent<HTMLTableSectionElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('input,select,textarea,a') && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const idx = Math.max(0, ids.indexOf(selectedId ?? -1))
    if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault()
      const next = ids[Math.min(ids.length - 1, Math.max(0, idx + (e.key === 'ArrowDown' || e.key === 'j' ? 1 : -1)))]
      if (next !== undefined) {
        select(next)
        prefetch(next)
        focusRow(next)
      }
    } else if (e.key === 'Enter' && target.dataset.row) {
      e.preventDefault()
      openLead(Number(target.dataset.row))
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      close()
    }
  }

  const toggle = (id: number) =>
    setChecked((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const bulk = async (status: LeadStatus) => {
    const targets = items.filter((r) => checked.has(r.id) && r.status !== status)
    for (const r of targets) await setStatus(r, status)
    setChecked(new Set())
  }

  const total = data?.total ?? 0
  const from = total ? (page - 1) * pageSize + 1 : 0
  const to = Math.min(total, page * pageSize)

  return (
    <section aria-label="Arizalar ro‘yxati" aria-busy={isFetching} className="flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-white">
      {someChecked && (
        <div role="region" aria-label="Tanlangan arizalar" className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-navy-soft px-4 text-sm">
          <span className="font-semibold text-navy">{[...checked].filter((id) => ids.includes(id)).length} ta tanlandi</span>
          <Select
            aria-label="Tanlanganlar statusini o‘zgartirish"
            wrapperClassName="w-60"
            className="h-8!"
            value=""
            disabled={updating}
            onChange={(e) => e.target.value && void bulk(e.target.value as LeadStatus)}
          >
            <option value="">Statusni o‘zgartirish…</option>
            {leadStatusChoices.map((s) => (
              <option key={s} value={s}>
                {leadStatusMeta[s].label}
              </option>
            ))}
          </Select>
          <AdminButton size="sm" variant="ghost" className="ml-auto" onClick={() => setChecked(new Set())}>
            Bekor qilish
          </AdminButton>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed border-collapse text-sm" aria-label="Arizalar" aria-rowcount={total}>
          <colgroup>
            {cols.map((w, i) => (w === '' ? null : <col key={i} style={w === 'auto' ? undefined : { width: w }} />))}
          </colgroup>
          <thead className="sticky top-0 z-[1] bg-(--am-bg) text-left text-xs font-medium text-ink-2">
            <tr className="h-10">
              <th scope="col" className="border-b border-line pl-4">
                <input
                  ref={headerBox}
                  type="checkbox"
                  aria-label="Sahifadagi hammasini tanlash"
                  className="m-0 size-4 align-middle accent-navy"
                  checked={allChecked}
                  onChange={() => setChecked(allChecked ? new Set() : new Set(ids))}
                />
              </th>
              <th scope="col" className="border-b border-line px-3 font-medium">
                №
              </th>
              <th scope="col" className="border-b border-line px-3 font-medium">
                Bemor
              </th>
              <th scope="col" className="border-b border-line px-3 font-medium">
                Telefon
              </th>
              <th scope="col" className="border-b border-line px-3 font-medium">
                Status
              </th>
              {wide && (
                <>
                  <th scope="col" className="border-b border-line px-3 font-medium">
                    Kim oldi
                  </th>
                  <th scope="col" className="border-b border-line px-3 font-medium">
                    Telegram
                  </th>
                </>
              )}
              <th scope="col" className="border-b border-line px-3 pr-4 text-right font-medium">
                Vaqt
              </th>
            </tr>
          </thead>
          <tbody ref={body} onKeyDown={onKeyDown}>
            {items.map((r, i) => {
              const on = r.id === selectedId
              const rovingFocus = selectedId === null || !ids.includes(selectedId) ? i === 0 : on
              const late = isLate(r, now)
              return (
                <tr
                  key={r.id}
                  data-row={r.id}
                  tabIndex={rovingFocus ? 0 : -1}
                  aria-selected={open && on}
                  onClick={() => openLead(r.id)}
                  onMouseEnter={() => prefetch(r.id)}
                  onFocus={(e) => e.target === e.currentTarget && select(r.id)}
                  className="am-row h-14 cursor-pointer outline-offset-[-2px]"
                >
                  <td className="border-b border-line pl-4" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Tanlash: ariza ${r.id}`} className="m-0 size-4 align-middle accent-navy" checked={checked.has(r.id)} onChange={() => toggle(r.id)} />
                  </td>
                  <td className="border-b border-line px-3 text-[13px] text-ink-2 tabular-nums">#{r.id}</td>
                  <td className="min-w-0 border-b border-line px-3">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation()
                        openLead(r.id)
                      }}
                      className="block max-w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-sm leading-5 font-semibold text-ink"
                    >
                      {r.full_name}
                    </button>
                    <div className="truncate text-[13px] leading-[18px] text-ink-2">{r.message?.trim() || '—'}</div>
                  </td>
                  <td className="border-b border-line px-3">
                    <div className="text-sm leading-5 whitespace-nowrap tabular-nums">{formatUzPhone(r.phone)}</div>
                    <a href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()} tabIndex={-1} aria-label={`Qo‘ng‘iroq qilish: ${r.full_name}`} className="am-link text-xs leading-4 text-ink-2">
                      Qo‘ng‘iroq
                    </a>
                  </td>
                  <td className="border-b border-line px-3">
                    <LeadStatusTag status={r.status} />
                  </td>
                  {wide && (
                    <>
                      <td className="border-b border-line px-3 text-[13px]">
                        {r.taken_by ? (
                          <span className="flex min-w-0 items-center gap-2">
                            <UserAvatar name={r.taken_by} size={24} />
                            <span className="truncate">{shortName(r.taken_by)}</span>
                          </span>
                        ) : (
                          <span className="text-ink-2">—</span>
                        )}
                      </td>
                      <td className="border-b border-line px-3">
                        <TelegramDelivery value={r.tg_delivery} />
                      </td>
                    </>
                  )}
                  <td className={`border-b border-line px-3 pr-4 text-right text-[13px] whitespace-nowrap tabular-nums ${late ? 'font-semibold text-coral-ink' : 'text-ink-2'}`}>
                    <time dateTime={r.created_at}>{leadTime(r.created_at, now)}</time>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {isPending && <SkeletonRows rows={8} />}
        {!isPending && error ? <ErrorState message={errorMessage(error)} onRetry={onRetry} /> : null}
        {!isPending && !error && items.length === 0 && (
          <EmptyState
            title="Bu filtr bo‘yicha ariza yo‘q"
            action={
              onClearFilters && (
                <button type="button" onClick={onClearFilters} className="am-link cursor-pointer border-0 bg-transparent text-[13px] font-medium text-ink">
                  Filtrlarni tozalash
                </button>
              )
            }
          />
        )}
      </div>

      <div className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-t border-line px-4">
        <div className="text-[13px] text-ink-2" aria-live="polite">
          {total ? `${total} tadan ${from}–${to} ko‘rsatilmoqda` : ''}
          <span className="ml-3 text-xs max-lg:hidden">↑/↓ — tanlash · Enter — ochish · Esc — yopish</span>
        </div>
        <Pagination page={page} pages={data?.pages ?? 1} onChange={onPage} />
      </div>
    </section>
  )
}
