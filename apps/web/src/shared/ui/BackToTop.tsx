'use client'

import { useEffect, useState } from 'react'

import { ArrowUp } from './Icons'

const SHOW_AFTER = 600

/**
 * O‘ng pastki burchakda «yuqoriga» tugmasi: ~1 ekran pastga tushilgach paydo bo‘ladi.
 * Mobil'da pastdagi qo‘ng‘iroq/yozilish paneli (MobileCta) ustida turadi.
 * Silliq aylantirish html'dagi `scroll-behavior` orqali — reduced-motion'da avtomatik o‘chadi.
 */
export function BackToTop({ label }: { label: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      setVisible(window.scrollY > SHOW_AFTER)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={() => {
        window.scrollTo({ top: 0 })
        // Fokus sahifa boshiga (skip-link) — klaviatura foydalanuvchisi yuqoridan davom etadi
        document.querySelector<HTMLElement>('a[href="#main"]')?.focus({ preventScroll: true })
      }}
      className={`fixed right-5 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 flex size-12 items-center justify-center rounded-full border border-line bg-white text-navy shadow-[0_8px_24px_-10px_rgb(19_41_75/0.35)] transition-[opacity,translate,background-color,color] duration-300 ease-(--ease-soft) hover:bg-navy hover:text-white md:right-8 md:bottom-8 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <ArrowUp size={18} />
    </button>
  )
}
