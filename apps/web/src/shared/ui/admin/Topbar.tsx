import Link from 'next/link'
import type { ReactNode } from 'react'

import { ExternalIcon } from './icons'

/**
 * Sahifa yuqori paneli (64px, oq, pastki chiziq). Har sahifa o‘zinikini beradi:
 * chapda sarlavha yoki breadcrumb, o‘ngda amallar.
 */
export function Topbar({ title, crumbs, children, start }: { title?: ReactNode; crumbs?: { label: string; href?: string }[]; children?: ReactNode; start?: ReactNode }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-5 border-b border-line bg-white px-8 max-md:h-14 max-md:gap-3 max-md:px-4">
      {start}
      {crumbs ? (
        <nav aria-label="Joylashuv" className="flex min-w-0 items-center gap-2 text-[15px]">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1
            return (
              <span key={i} className={`flex items-center gap-2 ${last ? 'min-w-0' : 'shrink-0'}`}>
                {c.href && !last ? (
                  <Link href={c.href} className="am-link font-medium text-ink-2">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined} className="truncate font-semibold">
                    {c.label}
                  </span>
                )}
                {!last && (
                  <span aria-hidden className="text-field">
                    /
                  </span>
                )}
              </span>
            )
          })}
        </nav>
      ) : (
        <div className="truncate text-[15px] font-semibold">{title}</div>
      )}
      {children && <div className="ml-auto flex shrink-0 items-center gap-4 max-md:gap-2">{children}</div>}
    </header>
  )
}

/** Tashqi havola (sayt sahifasi) — yangi tabda, noopener */
export function SiteLink({ href, children = 'Saytda ko‘rish', className = '' }: { href: string; children?: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`am-link flex items-center gap-1.5 text-sm font-medium whitespace-nowrap ${className}`}>
      {children}
      <ExternalIcon />
      <span className="sr-only">(yangi oynada ochiladi)</span>
    </a>
  )
}

/** «Saqlandi · 2 daqiqa oldin» / «Saqlanmagan o‘zgarishlar» indikatori */
export function SaveState({ dirty, savedText, saving }: { dirty: boolean; savedText?: string; saving?: boolean }) {
  const text = saving ? 'Saqlanmoqda…' : dirty ? 'Saqlanmagan o‘zgarishlar' : savedText
  if (!text) return null
  return (
    <div role="status" className="flex items-center gap-2 text-[13px] whitespace-nowrap text-ink-2 max-md:hidden">
      <span aria-hidden className={`size-2 rounded-full ${dirty ? 'bg-(--am-warn-dot)' : 'bg-(--am-ok)'}`} />
      {text}
    </div>
  )
}
