import type { ReactNode } from 'react'

export function EmptyState({ title, children, action, className = '' }: { title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 px-5 py-12 text-center ${className}`}>
      <p className="m-0 text-sm font-semibold text-ink">{title}</p>
      {children && <div className="max-w-[420px] text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
      <p className="m-0 text-sm text-ink-2">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="am-btn-o h-8 cursor-pointer rounded-control border border-line-strong bg-white px-3 text-[13px] font-medium">
          Qayta urinish
        </button>
      )}
    </div>
  )
}

/** Sariq ogohlantirish satri (masalan «Portret yuklanmagan») */
export function Notice({ tone = 'warn', children, className = '' }: { tone?: 'warn' | 'info'; children: ReactNode; className?: string }) {
  const cls = tone === 'warn' ? 'bg-(--am-warn-soft) text-(--am-warn)' : 'bg-navy-soft text-navy'
  return (
    <div className={`flex gap-2 rounded-control px-3.5 py-2.5 text-[13px] leading-normal font-medium ${cls} ${className}`}>
      {tone === 'warn' && <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-current" />}
      <div>{children}</div>
    </div>
  )
}
