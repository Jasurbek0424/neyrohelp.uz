'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery'
import { ArrowLeft, ArrowRight } from '@/shared/ui/Icons'

const INTERVAL_MS = 4000

type Labels = { prev: string; next: string; pause: string; play: string }

/**
 * Avto-aylanuvchi karusel: CSS scroll-snap (telefonda barmoq bilan suriladi),
 * har INTERVAL_MS da bitta slaydga siljiydi, oxiridan boshiga qaytadi.
 * To‘xtaydi: hover/fokus, pauza tugmasi, ekrandan tashqarida, yashirin tab, reduced-motion.
 */
export function GalleryCarousel({ slides, labels }: { slides: ReactNode[]; labels: Labels }) {
  const track = useRef<HTMLUListElement>(null)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [paused, setPaused] = useState(false)
  const [hold, setHold] = useState(false)
  const [visible, setVisible] = useState(false)
  const [tick, setTick] = useState(0)
  const [overflow, setOverflow] = useState(slides.length > 1)
  const auto = overflow && !reduced

  const step = useCallback(
    (dir: 1 | -1) => {
      const el = track.current
      const first = el?.firstElementChild as HTMLElement | null
      if (!el || !first) return
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0
      const max = el.scrollWidth - el.clientWidth
      const behavior = reduced ? 'auto' : 'smooth'
      if (dir > 0 && el.scrollLeft >= max - 4) el.scrollTo({ left: 0, behavior })
      else if (dir < 0 && el.scrollLeft <= 4) el.scrollTo({ left: max, behavior })
      else el.scrollBy({ left: dir * (first.offsetWidth + gap), behavior })
    },
    [reduced],
  )

  useEffect(() => {
    const el = track.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    // Hamma slayd bir ekranga sig‘sa — aylantirish va tugmalar kerak emas
    const ro = new ResizeObserver(() => setOverflow(el.scrollWidth - el.clientWidth > 4))
    ro.observe(el)
    return () => {
      io.disconnect()
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!auto || paused || hold || !visible) return
    const id = window.setInterval(() => {
      if (!document.hidden) step(1)
    }, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [auto, paused, hold, visible, step, tick])

  // Qo‘lda surilganda taymer qaytadan boshlanadi — slayd darhol o‘tib ketmaydi
  const nav = (dir: 1 | -1) => {
    step(dir)
    setTick((n) => n + 1)
  }

  const btn = 'flex size-10 cursor-pointer items-center justify-center rounded-control border border-line bg-white text-ink hover:border-ink'

  return (
    <div
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false)
      }}
    >
      <ul ref={track} onPointerDown={() => setTick((n) => n + 1)} className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain">
        {slides.map((s, i) => (
          <li key={i} className="w-full shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)]">
            {s}
          </li>
        ))}
      </ul>
      {overflow ? (
        <div className="mt-6 flex items-center justify-end gap-2">
          {auto ? (
            <button type="button" aria-pressed={paused} aria-label={paused ? labels.play : labels.pause} onClick={() => setPaused((v) => !v)} className={btn}>
              {paused ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                  <path d="M3.5 2v10l8-5z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                  <path d="M3 2h3v10H3zM8 2h3v10H8z" />
                </svg>
              )}
            </button>
          ) : null}
          <button type="button" aria-label={labels.prev} onClick={() => nav(-1)} className={btn}>
            <ArrowLeft size={14} />
          </button>
          <button type="button" aria-label={labels.next} onClick={() => nav(1)} className={btn}>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
