'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { CloseIcon, MenuIcon } from '@/shared/ui/Icons'

type Props = {
  items: { href: string; label: string }[]
  openLabel: string
  closeLabel: string
  phone: { href: string; label: string }
  cta: { href: string; label: string }
  children?: ReactNode
}

/** Mobil menyu: native <dialog> — fokus tuzog‘i, Esc va orqa fonni brauzer o‘zi boshqaradi */
export function MobileMenu({ items, openLabel, closeLabel, phone, cta, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const pathname = usePathname() ?? ''

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label={openLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex size-11 items-center justify-center rounded-control border border-line lg:hidden"
      >
        <MenuIcon />
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        aria-label={openLabel}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-white p-0 text-ink backdrop:bg-ink/30"
      >
        <div className="container-site flex h-full flex-col">
          <div className="flex h-18 items-center justify-between">
            {children}
            <button
              type="button"
              aria-label={closeLabel}
              onClick={() => setOpen(false)}
              className="ml-auto flex size-11 items-center justify-center rounded-control border border-line"
            >
              <CloseIcon />
            </button>
          </div>
          <nav className="flex flex-col border-t border-ink">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'page' : undefined}
                className="border-b border-line py-5 text-2xl font-semibold tracking-tight aria-[current=page]:text-navy"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-4 pb-8">
            <a href={phone.href} className="text-xl font-semibold">
              {phone.label}
            </a>
            <Link
              href={cta.href}
              onClick={() => setOpen(false)}
              className="flex h-13 items-center justify-center rounded-control bg-navy font-medium text-white"
            >
              {cta.label}
            </Link>
          </div>
        </div>
      </dialog>
    </>
  )
}
