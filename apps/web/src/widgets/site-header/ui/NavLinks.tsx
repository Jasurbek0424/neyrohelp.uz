'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Item = { href: string; label: string }

/** Joriy bo‘limni coral tag chiziq bilan belgilaydi */
export function NavLinks({ items, label }: { items: Item[]; label: string }) {
  const pathname = usePathname() ?? ''
  return (
    <nav aria-label={label} className="hidden h-full items-stretch gap-8 lg:flex">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center border-b-2 pt-0.5 text-[15px] font-medium transition-colors duration-200 ${
              active ? 'border-coral text-ink' : 'border-transparent text-ink-2 hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
