import type { ReactNode } from 'react'

export type Tone = 'coral' | 'navy' | 'ok' | 'warn' | 'neutral'

const tones: Record<Tone, string> = {
  coral: 'bg-coral-soft text-coral-ink',
  navy: 'bg-navy-soft text-navy',
  ok: 'bg-(--am-ok-soft) text-(--am-ok)',
  warn: 'bg-(--am-warn-soft) text-(--am-warn)',
  neutral: 'bg-(--am-neutral-soft) text-ink-2',
}

/** Status tegi: radius 4, 12px 600, padding 2px 8px */
export function StatusTag({ tone, children, dot, className = '' }: { tone: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]} ${className}`}>
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Hisoblagich (tab/badge) */
export function CountBadge({ children, tone = 'neutral', solid }: { children: ReactNode; tone?: 'neutral' | 'coral'; solid?: boolean }) {
  const cls = solid ? 'bg-coral-ink text-white' : tone === 'coral' ? 'bg-coral-soft text-coral-ink' : 'bg-(--am-neutral-soft) text-ink-2'
  return <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] px-1.5 text-xs font-semibold tabular-nums ${cls}`}>{children}</span>
}
