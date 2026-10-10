'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { DurationCell, FromCell, PriceCell, PriceSaveBar, useRowDirty } from '@/features/admin-price-edit'
import { ServiceDialog, ServiceRowMenu } from '@/features/admin-service-edit'
import { servicesQuery, useReorderServices, type Service, type ServiceCategory } from '@/entities/admin-service'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { lt, ltOr } from '@/shared/lib/admin/ltext'
import { useUrlState } from '@/shared/lib/hooks/useUrlState'
import { AdminButton } from '@/shared/ui/admin/Button'
import { EmptyState, ErrorState, Notice } from '@/shared/ui/admin/EmptyState'
import { GripIcon, PlusIcon } from '@/shared/ui/admin/icons'
import { FillDots } from '@/shared/ui/admin/LocaleTabs'
import { SearchField } from '@/shared/ui/admin/SearchField'
import { Segmented } from '@/shared/ui/admin/Segmented'
import { SkeletonRows } from '@/shared/ui/admin/Skeleton'
import { StatusTag } from '@/shared/ui/admin/StatusTag'
import { toast } from '@/shared/ui/admin/Toast'
import { SiteLink, Topbar } from '@/shared/ui/admin/Topbar'

const KEYS = ['q', 'cat'] as const
const td = 'border-b border-(--am-grid) px-2 first:pl-5 last:pr-5'

type Dialog = { open: boolean; service?: Service | null; categoryId?: number }

function ServiceRow({
  service,
  index,
  dragging,
  onDragStart,
  onDrop,
  onDragEnd,
  onMove,
  onEdit,
}: {
  service: Service
  index: number
  dragging: boolean
  onDragStart: () => void
  onDrop: () => void
  onDragEnd: () => void
  onMove: (delta: -1 | 1) => void
  onEdit: () => void
}) {
  const dirty = useRowDirty(service.id)
  const name = ltOr(service.title)
  return (
    <tr
      className={`h-14 ${dirty ? 'bg-(--am-dirty-row)' : 'bg-white'} ${dragging ? 'opacity-50' : ''}`}
      draggable={dragging}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
    >
      <td className={td}>
        <button
          type="button"
          aria-label={`${name}: tartibni o‘zgartirish (${index + 1}-o‘rin, ↑/↓ tugmalari)`}
          className="am-ghost flex size-8 cursor-grab items-center justify-center rounded-control border-0 bg-transparent p-0"
          onMouseDown={onDragStart}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              onMove(e.key === 'ArrowUp' ? -1 : 1)
            }
          }}
        >
          <GripIcon />
        </button>
      </td>
      <td className={`${td} min-w-0`}>
        <div className="flex items-center gap-2">
          <span className={`truncate text-sm font-semibold ${service.is_active ? '' : 'text-ink-2'}`}>{name}</span>
          {!service.is_active && <StatusTag tone="neutral">Yashirin</StatusTag>}
        </div>
        <div className="mt-0.5 truncate text-[13px] text-ink-2">{lt(service.note) || '—'}</div>
      </td>
      <td className={td}>
        <DurationCell service={service} />
      </td>
      <td className={td}>
        <PriceCell service={service} />
      </td>
      <td className={td}>
        <FromCell service={service} />
      </td>
      <td className={td}>
        <FillDots value={service.completeness} />
      </td>
      <td className={td}>
        <ServiceRowMenu service={service} onEdit={onEdit} />
      </td>
    </tr>
  )
}

/** A6: narxlar — inline tahrir (Zustand'da saqlanmagan qiymatlar), pastda sticky «Hammasini saqlash» (PATCH /services/bulk) */
export function AdminServicesPage() {
  const q = useQuery(servicesQuery())
  const reorder = useReorderServices()
  const [url, setUrl] = useUrlState(KEYS)
  const [dialog, setDialog] = useState<Dialog>({ open: false })
  const [drag, setDrag] = useState<{ cat: number; index: number } | null>(null)
  const needle = url.q.trim().toLowerCase()
  const catId = Number(url.cat) || 0

  const groups = useMemo(() => {
    const cats = [...(q.data ?? [])].sort((a, b) => a.order - b.order)
    return cats
      .filter((c) => !catId || c.id === catId)
      .map((c) => ({ cat: c, rows: [...c.services].sort((a, b) => a.order - b.order).filter((s) => !needle || ltOr(s.title).toLowerCase().includes(needle)) }))
      .filter((g) => g.rows.length || (!needle && catId === g.cat.id))
  }, [q.data, needle, catId])

  /** Guruh ichida ko‘chirish: to‘liq tartibni 10, 20, 30… qilib qayta raqamlaymiz va faqat o‘zgarganlarini yuboramiz */
  const move = (cat: ServiceCategory, from: number, to: number) => {
    const list = [...cat.services].sort((a, b) => a.order - b.order)
    if (needle || to < 0 || to >= list.length || from === to) return
    const [it] = list.splice(from, 1)
    list.splice(to, 0, it!)
    const changed = list.map((s, i) => ({ id: s.id, order: (i + 1) * 10, prev: s.order })).filter((x) => x.order !== x.prev)
    reorder.mutate(
      changed.map(({ id, order }) => ({ id, order })),
      { onSuccess: () => toast.success('Tartib saqlandi'), onError: (e) => toast.error(errorMessage(e)) },
    )
  }

  const categories = q.data ?? []
  const segOptions = [{ value: '0', label: 'Barchasi' }, ...[...categories].sort((a, b) => a.order - b.order).map((c) => ({ value: String(c.id), label: ltOr(c.title) }))]

  return (
    <>
      <Topbar title="Xizmatlar va narxlar">
        <SiteLink href="/uz/yonalishlar" className="max-sm:hidden" />
        <AdminButton variant="primary" onClick={() => setDialog({ open: true, service: null, categoryId: catId || undefined })} disabled={!categories.length}>
          <PlusIcon />
          Xizmat qo‘shish
        </AdminButton>
      </Topbar>

      <main id="admin-main" className="flex min-h-0 flex-1 flex-col gap-4 px-8 py-6 max-md:px-4 max-md:py-4">
        <Notice tone="info" className="shrink-0">
          Narxni bo‘sh qoldirsangiz, saytda «Administrator aytadi» yoziladi. O‘zgarishlar saqlangandan so‘ng saytda darhol yangilanadi.
        </Notice>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <SearchField label="Xizmat nomi bo‘yicha qidirish" placeholder="Xizmat nomi bo‘yicha qidirish" wrapperClassName="w-[320px] max-md:w-full" defaultValue={url.q} onChange={(e) => setUrl({ q: e.target.value })} />
          {categories.length > 0 && (
            <div className="am-hs max-w-full overflow-x-auto">
              <Segmented label="Yo‘nalish bo‘yicha filtr" value={String(catId)} onChange={(v) => setUrl({ cat: v === '0' ? null : v })} options={segOptions} itemClassName="px-4" />
            </div>
          )}
        </div>

        <section aria-label="Xizmatlar jadvali" className="min-h-0 flex-1 overflow-auto rounded-card border border-line bg-white">
          {q.isPending ? (
            <SkeletonRows rows={8} />
          ) : q.isError ? (
            <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
          ) : !groups.length ? (
            <EmptyState title="Hech narsa topilmadi">Qidiruv yoki filtrni o‘zgartiring.</EmptyState>
          ) : (
            <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
              <colgroup>
                <col style={{ width: 52 }} />
                <col />
                <col style={{ width: 126 }} />
                <col style={{ width: 186 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 96 }} />
                <col style={{ width: 60 }} />
              </colgroup>
              <thead className="sticky top-0 z-[1] bg-white text-left text-xs font-medium text-ink-2">
                <tr className="h-10">
                  <th scope="col" className="border-b border-line pl-5">
                    <span className="sr-only">Tartib</span>
                  </th>
                  <th scope="col" className="border-b border-line px-2 font-medium">
                    Nomi
                  </th>
                  <th scope="col" className="border-b border-line px-2 font-medium">
                    Davomiylik
                  </th>
                  <th scope="col" className="border-b border-line px-2 text-right font-medium">
                    Narx
                  </th>
                  <th scope="col" className="border-b border-line px-2 font-medium">
                    …dan
                  </th>
                  <th scope="col" className="border-b border-line px-2 font-medium">
                    Tarjima
                  </th>
                  <th scope="col" className="border-b border-line pr-5">
                    <span className="sr-only">Amallar</span>
                  </th>
                </tr>
              </thead>
              {groups.map(({ cat, rows }) => {
                const ordered = [...cat.services].sort((a, b) => a.order - b.order)
                return (
                  <tbody key={cat.id}>
                    <tr className="h-11 bg-sand">
                      <th scope="rowgroup" colSpan={7} className="border-y border-line px-5 text-left">
                        <span className="flex items-center gap-3">
                          <span className="text-sm font-semibold">{ltOr(cat.title)}</span>
                          <span className="text-[13px] font-normal text-ink-2">{rows.length} xizmat</span>
                          {cat.show_on_home && (
                            <StatusTag tone="ok" className="ml-auto">
                              Bosh sahifada
                            </StatusTag>
                          )}
                          <button
                            type="button"
                            onClick={() => setDialog({ open: true, service: null, categoryId: cat.id })}
                            className={`am-link cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium text-ink ${cat.show_on_home ? '' : 'ml-auto'}`}
                          >
                            Qo‘shish
                          </button>
                        </span>
                      </th>
                    </tr>
                    {rows.map((s) => {
                      const index = ordered.findIndex((x) => x.id === s.id)
                      return (
                        <ServiceRow
                          key={s.id}
                          service={s}
                          index={index}
                          dragging={drag?.cat === cat.id && drag.index === index}
                          onDragStart={() => setDrag({ cat: cat.id, index })}
                          onDrop={() => {
                            if (drag && drag.cat === cat.id) move(cat, drag.index, index)
                            setDrag(null)
                          }}
                          onDragEnd={() => setDrag(null)}
                          onMove={(delta) => move(cat, index, index + delta)}
                          onEdit={() => setDialog({ open: true, service: s })}
                        />
                      )
                    })}
                    {!rows.length && (
                      <tr>
                        <td colSpan={7} className="border-b border-(--am-grid) px-5 py-4 text-[13px] text-ink-2">
                          Bu yo‘nalishda hali xizmat yo‘q.
                        </td>
                      </tr>
                    )}
                  </tbody>
                )
              })}
            </table>
          )}
        </section>

        <PriceSaveBar />
      </main>

      {categories.length > 0 && (
        <ServiceDialog open={dialog.open} onClose={() => setDialog({ open: false })} categories={categories} service={dialog.service} defaultCategoryId={dialog.categoryId} />
      )}
    </>
  )
}
