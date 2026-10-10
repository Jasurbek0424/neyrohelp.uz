'use client'

import { useState, type ReactNode } from 'react'

import { ArrowLeft, ArrowRight } from '@/shared/ui/Icons'

/**
 * Hero rasmlari: slaydlar server'da render qilinadi (birinchisi priority — LCP),
 * client faqat qaysi biri ko‘rinishini almashtiradi.
 */
export function HeroGallery({ slides, labels }: { slides: { node: ReactNode; label: string }[]; labels: { prev: string; next: string } }) {
  const [i, setI] = useState(0)
  const count = slides.length
  const go = (d: number) => setI((v) => (v + d + count) % count)
  const current = slides[i]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative min-h-80 flex-1">
        {slides.map((s, idx) => (
          <div
            key={idx}
            aria-hidden={idx !== i}
            className={`absolute inset-0 transition-opacity duration-500 ${idx === i ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            {s.node}
          </div>
        ))}
      </div>
      <div className="flex h-8 items-center justify-between text-[13px] text-ink-2">
        <span aria-live="polite">
          {String(i + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
          {current?.label ? ` · ${current.label}` : ''}
        </span>
        {count > 1 ? (
          <div className="flex gap-2">
            <button
              type="button"
              aria-label={labels.prev}
              onClick={() => go(-1)}
              className="flex size-8 items-center justify-center rounded-control border border-line bg-white text-ink hover:border-ink"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              type="button"
              aria-label={labels.next}
              onClick={() => go(1)}
              className="flex size-8 items-center justify-center rounded-control border border-line bg-white text-ink hover:border-ink"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
