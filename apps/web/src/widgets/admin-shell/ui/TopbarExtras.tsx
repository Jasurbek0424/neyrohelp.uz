'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { leadCountsQuery } from '@/entities/lead'
import { adminPaths, canAccess, type Me } from '@/entities/session'
import { useHotkey } from '@/shared/lib/hooks/useHotkey'
import { Icon } from '@/shared/ui/admin/icons'
import { SearchField } from '@/shared/ui/admin/SearchField'

/** Topbar qidiruvi (⌘K / Ctrl+K): operator/admin — arizalarda, muharrir — maqolalarda */
export function GlobalSearch({ me }: { me: Me }) {
  const router = useRouter()
  const ref = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  useHotkey(
    'k',
    (e) => {
      e.preventDefault()
      ref.current?.focus()
    },
    { meta: true },
  )
  const target = canAccess(me.role, 'leads') ? adminPaths.leads : adminPaths.posts
  return (
    <form
      role="search"
      className="w-[360px] max-lg:w-60 max-md:hidden"
      onSubmit={(e) => {
        e.preventDefault()
        if (q.trim()) router.push(`${target}?q=${encodeURIComponent(q.trim())}`)
      }}
    >
      <SearchField
        ref={ref}
        tone="sand"
        wrapperClassName="h-[38px]!"
        label={canAccess(me.role, 'leads') ? 'Arizalardan qidirish' : 'Maqolalardan qidirish'}
        placeholder={canAccess(me.role, 'leads') ? 'Ariza: ism yoki telefon…' : 'Maqola sarlavhasi…'}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </form>
  )
}

export function KbdHint() {
  return <span className="rounded-[4px] border border-line-strong bg-white px-1.5 py-0.5 text-xs">⌘K</span>
}

/** Qo‘ng‘iroqcha: javob kutayotgan arizalar soni */
export function NotificationBell({ me, size = 38 }: { me: Me; size?: number }) {
  const enabled = canAccess(me.role, 'leads')
  const counts = useQuery({ ...leadCountsQuery(), enabled: enabled && !me.totp_required })
  if (!enabled) return null
  const n = counts.data?.new ?? 0
  return (
    <Link
      href={`${adminPaths.leads}?status=new`}
      aria-label={n ? `Bildirishnomalar, ${n} ta yangi ariza` : 'Bildirishnomalar, yangi ariza yo‘q'}
      style={{ width: size, height: size }}
      className="am-btn-o relative flex shrink-0 items-center justify-center rounded-control border border-line bg-white text-ink max-md:border-0 max-md:bg-transparent"
    >
      <Icon name="bell" size={size > 40 ? 22 : 18} />
      {n > 0 && <span aria-hidden className="absolute top-[7px] right-2 size-2 rounded-full border-2 border-white bg-coral" />}
    </Link>
  )
}
