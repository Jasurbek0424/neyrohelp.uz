'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

import { TakeLeadButton } from '@/features/admin-lead-status'
import { GlobalSearch, KbdHint, NotificationBell, useMe } from '@/widgets/admin-shell'
import { PostStatusTag } from '@/entities/admin-post'
import { dashboardQuery, isLate, type Dashboard } from '@/entities/lead'
import { adminPaths, canAccess } from '@/entities/session'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { ageShort, greeting, relativeDayTime, shortDate, weekdayDate } from '@/shared/lib/admin/time'
import { useNow } from '@/shared/lib/hooks/useNow'
import { formatUzPhone } from '@/shared/lib/phone'
import { AdminButtonLink } from '@/shared/ui/admin/Button'
import { EmptyState, ErrorState } from '@/shared/ui/admin/EmptyState'
import { CheckIcon, Icon, PlusIcon } from '@/shared/ui/admin/icons'
import { Skeleton } from '@/shared/ui/admin/Skeleton'
import { StatusTag } from '@/shared/ui/admin/StatusTag'
import { SiteLink, Topbar } from '@/shared/ui/admin/Topbar'

import { LeadsChart } from './LeadsChart'

const card = 'rounded-card border border-line bg-white'
const statCard = `${card} flex h-28 flex-col justify-between px-5 py-[18px]`
const big = 'text-[32px] font-semibold tracking-[-0.02em] tabular-nums'

function Stats({ d }: { d: Dashboard }) {
  const pct = d.booked_14d.total ? Math.round((d.booked_14d.booked / d.booked_14d.total) * 100) : 0
  const avg = d.avg_response_minutes_7d
  return (
    <section aria-label="Asosiy ko‘rsatkichlar" className="grid grid-cols-4 gap-4 max-xl:grid-cols-2">
      <div className={statCard}>
        <div className="text-[13px] text-ink-2">Bugungi arizalar</div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className={big}>{d.today.leads}</span>
          <span className="text-[13px] text-ink-2">kecha: {d.today.yesterday}</span>
        </div>
      </div>
      <Link href={`${adminPaths.leads}?status=new`} className={`${statCard} am-btn-o`}>
        <div className="flex items-center gap-2 text-[13px] text-ink-2">
          <span aria-hidden className={`size-2 rounded-full ${d.waiting.count ? 'bg-coral' : 'bg-(--am-ok)'}`} />
          Javob kutmoqda
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className={`${big} ${d.waiting.count ? 'text-coral-ink' : ''}`}>{d.waiting.count}</span>
          {d.waiting.oldest_minutes !== null && d.waiting.count > 0 && <span className="text-[13px] font-medium text-coral-ink">eng eskisi {d.waiting.oldest_minutes} daq</span>}
        </div>
      </Link>
      <div className={statCard}>
        <div className="text-[13px] text-ink-2">O‘rtacha javob vaqti · 7 kun</div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className={big}>
            {avg ?? '—'} {avg !== null && <span className="text-base font-medium text-ink-2">daq</span>}
          </span>
          {avg !== null &&
            (avg <= 15 ? (
              <span className="flex items-center gap-1 text-[13px] font-medium text-(--am-ok)">
                <CheckIcon />
                maqsad 15 daq
              </span>
            ) : (
              <span className="text-[13px] font-medium text-(--am-warn)">maqsad 15 daq</span>
            ))}
        </div>
      </div>
      <div className={statCard}>
        <div className="text-[13px] text-ink-2">Qabulga yozildi · 14 kun</div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className={big}>{pct}%</span>
          <span className="text-[13px] text-ink-2">
            {d.booked_14d.booked} / {d.booked_14d.total} ariza
          </span>
        </div>
      </div>
    </section>
  )
}

function Waiting({ d, canTake }: { d: Dashboard; canTake: boolean }) {
  const now = useNow(30_000)
  return (
    <section aria-labelledby="waiting-title" className={`${card} flex h-[340px] flex-col pt-5`}>
      <div className="flex items-center justify-between px-5">
        <h2 id="waiting-title" className="m-0 text-base font-semibold">
          Javob kutmoqda
        </h2>
        {canTake && (
          <Link href={`${adminPaths.leads}?status=new`} className="am-link text-[13px] font-medium">
            Barchasi
          </Link>
        )}
      </div>
      {d.waiting_list.length ? (
        <ul className="m-0 mt-3.5 min-h-0 flex-1 list-none overflow-auto border-t border-line p-0">
          {d.waiting_list.map((r) => {
            const late = isLate(r, now)
            return (
              <li key={r.id} className="am-row flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{r.full_name}</span>
                    <span className={`shrink-0 text-xs tabular-nums ${late ? 'font-semibold text-coral-ink' : 'text-ink-2'}`}>{ageShort(r.created_at, now)}</span>
                  </div>
                  <div className="mt-[3px] truncate text-[13px] text-ink-2">
                    {formatUzPhone(r.phone)}
                    {r.message ? ` · ${r.message}` : ''}
                  </div>
                </div>
                {canTake && <TakeLeadButton lead={r} />}
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState className="flex-1 border-t border-line" title="Hamma arizalarga javob berilgan">
          Yangi ariza kelsa shu yerda va Telegram guruhda ko‘rinadi.
        </EmptyState>
      )}
      <div className="mt-auto border-t border-line px-5 py-3 text-xs text-ink-2">15 daqiqadan oshganlari qizil bilan belgilanadi</div>
    </section>
  )
}

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 border-t border-line py-[9px] ${last ? 'border-b' : ''}`}>
      <dt className="text-ink-2">{label}</dt>
      <dd className="m-0 font-medium tabular-nums">{children}</dd>
    </div>
  )
}

function Bottom({ d }: { d: Dashboard }) {
  const todo = d.content_todo
  const todos = todo
    ? [
        { label: 'Portreti yo‘q shifokorlar', n: todo.doctors_without_photo, href: `${adminPaths.doctors}?f=nophoto` },
        { label: 'Narxi kiritilmagan xizmatlar', n: todo.services_without_price, href: adminPaths.services },
        { label: 'Ruscha tarjimasi yo‘q maqolalar', n: todo.posts_missing_ru, href: adminPaths.posts },
        { label: 'Litsenziya fayli yuklanmagan', n: todo.documents_without_file, href: `${adminPaths.settings}?tab=clinic` },
      ]
    : []
  return (
    <div className={`grid gap-4 max-lg:grid-cols-1 ${todo ? 'grid-cols-3' : 'grid-cols-1'}`}>
      <section aria-labelledby="tg-title" className={`${card} flex min-h-[236px] flex-col p-5`}>
        <div className="flex items-center justify-between">
          <h2 id="tg-title" className="m-0 text-base font-semibold">
            Telegram bot
          </h2>
          {d.telegram.enabled ? (
            <StatusTag tone="ok" dot>
              Ulangan
            </StatusTag>
          ) : (
            <StatusTag tone="warn" dot>
              O‘chirilgan
            </StatusTag>
          )}
        </div>
        <dl className="mt-3.5 mb-0 text-sm">
          <Row label="Oxirgi yuborish">{d.telegram.last_sent_at ? relativeDayTime(d.telegram.last_sent_at) : '—'}</Row>
          <Row label="Yetib bormagan" last>
            <span className={d.telegram.failed ? 'text-(--am-warn)' : ''}>{d.telegram.failed}</span>
          </Row>
        </dl>
        <p className="mt-auto mb-0 pt-3 text-xs text-ink-2">Xato bo‘lsa ariza bazada qoladi va har 5 daqiqada qayta yuboriladi.</p>
      </section>

      {todo && (
        <section aria-labelledby="todo-title" className={`${card} flex min-h-[236px] flex-col p-5`}>
          <h2 id="todo-title" className="m-0 text-base font-semibold">
            Kontentni to‘ldirish
          </h2>
          <ul className="m-0 mt-3.5 list-none p-0 text-sm">
            {todos.map((t, i) => (
              <li key={t.label} className={`flex justify-between gap-2 border-t border-line py-[9px] ${i === todos.length - 1 ? 'border-b' : ''}`}>
                <span>{t.label}</span>
                {t.n ? (
                  <Link href={t.href} className="am-link font-semibold tabular-nums" aria-label={`${t.label}: ${t.n} ta — ochish`}>
                    {t.n}
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 font-semibold text-(--am-ok)" aria-label={`${t.label}: yo‘q`}>
                    <CheckIcon />0
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {todo && (
        <section aria-labelledby="posts-title" className={`${card} flex min-h-[236px] flex-col p-5`}>
          <div className="flex items-center justify-between">
            <h2 id="posts-title" className="m-0 text-base font-semibold">
              Blog
            </h2>
            <Link href={adminPaths.posts} className="am-link text-[13px] font-medium">
              Maqolalar
            </Link>
          </div>
          {d.recent_posts.length ? (
            <ul className="m-0 mt-3.5 list-none p-0 text-sm">
              {d.recent_posts.map((p, i) => (
                <li key={p.id} className={`flex justify-between gap-3 border-t border-line py-[9px] ${i === d.recent_posts.length - 1 ? 'border-b' : ''}`}>
                  <Link href={adminPaths.post(p.id)} className="truncate hover:underline">
                    {p.title || 'Nomsiz maqola'}
                  </Link>
                  <PostStatusTag status={p.status} label={p.status === 'scheduled' && p.published_at ? shortDate(p.published_at) : undefined} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3.5 text-sm text-ink-2">Hali maqola yo‘q.</p>
          )}
          {d.recent_posts.some((p) => p.status === 'scheduled') && <p className="mt-auto mb-0 pt-3 text-xs text-ink-2">Sana — rejalashtirilgan nashr kuni</p>}
        </section>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Yuklanmoqda" className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-card" />
        ))}
      </div>
      <div className="grid grid-cols-[2fr_1fr] gap-4 max-lg:grid-cols-1">
        <Skeleton className="h-[340px] rounded-card" />
        <Skeleton className="h-[340px] rounded-card" />
      </div>
    </div>
  )
}

/** A2: bosh panel — 60 soniyada yangilanadi (faqat tab ko‘rinib turganda) */
export function AdminDashboardPage() {
  const me = useMe()
  const q = useQuery(dashboardQuery())
  const canContent = canAccess(me.role, 'doctors')
  const canLeads = canAccess(me.role, 'leads')
  const firstName = me.name.split(/\s+/)[0] ?? me.name
  const waiting = q.data?.waiting.count ?? 0

  return (
    <>
      <Topbar title="Bosh panel">
        <div className="flex items-center gap-2 max-md:hidden">
          <GlobalSearch me={me} />
          <span className="max-lg:hidden">
            <KbdHint />
          </span>
        </div>
        <SiteLink href="/uz" className="max-sm:hidden">
          Saytni ochish
        </SiteLink>
        <NotificationBell me={me} />
      </Topbar>

      <main id="admin-main" className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-8 py-7 max-md:px-4 max-md:py-5">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="m-0 text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] max-md:text-2xl">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1.5 mb-0 text-sm text-ink-2">
              {weekdayDate()}
              {waiting > 0 && (
                <>
                  {' · '}
                  <span className="font-semibold text-coral-ink">{waiting} ta ariza javob kutmoqda</span>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {canContent ? (
              <>
                <AdminButtonLink href={adminPaths.doctorNew}>Shifokor qo‘shish</AdminButtonLink>
                <AdminButtonLink href={adminPaths.postNew} variant="primary">
                  <PlusIcon />
                  Yangi maqola
                </AdminButtonLink>
              </>
            ) : (
              canLeads && (
                <AdminButtonLink href={adminPaths.leads} variant="primary">
                  <Icon name="leads" size={16} />
                  Arizalarga o‘tish
                </AdminButtonLink>
              )
            )}
          </div>
        </div>

        {q.isPending ? (
          <DashboardSkeleton />
        ) : q.isError ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : (
          <>
            <Stats d={q.data} />
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 max-lg:grid-cols-1">
              <LeadsChart chart={q.data.chart} />
              <Waiting d={q.data} canTake={canLeads} />
            </div>
            <Bottom d={q.data} />
          </>
        )}
      </main>
    </>
  )
}
