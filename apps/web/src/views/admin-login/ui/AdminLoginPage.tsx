'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect } from 'react'

import { LoginForm } from '@/features/admin-auth-login'
import { homePathFor, meQueryOptions } from '@/entities/session'
import { LogoMark } from '@/shared/ui/Logo'

const points = ['Telegram guruh bilan sinxron arizalar', 'Uch tilda kontent: o‘zbek, rus, ingliz', 'Rollar: administrator, muharrir, operator']

/** A1: chapda forma (560px), o‘ngda navy panel. Sessiya tirik bo‘lsa — to‘g‘ridan-to‘g‘ri panelga. */
export function AdminLoginPage() {
  const router = useRouter()
  const me = useQuery({ ...meQueryOptions(), retry: false, refetchOnWindowFocus: false })
  useEffect(() => {
    if (me.data) router.replace(homePathFor(me.data.role))
  }, [me.data, router])

  return (
    <div className="flex min-h-dvh bg-white">
      <main id="admin-main" className="flex w-[560px] shrink-0 items-center justify-center px-4 py-12 max-lg:w-full">
        <div className="w-full max-w-[360px]">
          <Link href="/uz" aria-label="NeyroHelp — saytga qaytish" className="inline-flex items-center gap-2.5 text-ink">
            <LogoMark size={32} />
            <span className="text-[19px] font-semibold tracking-[-0.02em]">
              Neyro<span className="font-normal text-navy">Help</span>
            </span>
          </Link>
          <h1 className="mt-14 mb-0 text-[26px] leading-tight font-semibold tracking-[-0.02em]">Boshqaruv paneliga kirish</h1>
          <p className="mt-2 mb-0 text-sm leading-normal text-ink-2">Arizalar, shifokorlar va blog bilan ishlash uchun hisobingizga kiring.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>

      <aside aria-label="Panel haqida" className="relative flex min-w-0 flex-1 flex-col justify-between overflow-hidden bg-navy px-16 py-14 text-white max-lg:hidden">
        <div aria-hidden className="absolute inset-y-0 right-16 left-16 grid grid-cols-12 border-r border-white/5">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="border-l border-white/5" />
          ))}
        </div>
        <div className="relative flex items-center gap-2.5">
          <LogoMark size={32} inverted />
          <span className="text-[19px] font-semibold tracking-[-0.02em]">
            Neyro<span className="font-normal text-mist">Help</span>
          </span>
        </div>
        <div className="relative max-w-[600px]">
          <h2 className="m-0 text-4xl leading-[1.15] font-semibold tracking-[-0.03em]">Arizalar, shifokorlar va blog — bitta joyda</h2>
          <ul className="mt-10 mb-0 list-none p-0 text-[15px] text-mist">
            {points.map((p, i) => (
              <li key={p} className={`border-t border-white/16 py-4 ${i === points.length - 1 ? 'border-b' : ''}`}>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
