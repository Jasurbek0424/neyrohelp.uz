import { hhmm, relativeDayTime } from '@/shared/lib/admin/time'

import { eventTitle } from '../lib/events'
import type { LeadEvent } from '../model/types'

/**
 * Ariza tarixi. variant="timeline" — drawer (A3: nuqta + chiziq),
 * "table" — mobil ekran (A8: vaqt ustuni + ajratgich).
 */
export function LeadHistory({ events, variant = 'timeline' }: { events: LeadEvent[]; variant?: 'timeline' | 'table' }) {
  if (!events.length) return <p className="m-0 text-sm text-ink-2">Hodisa yo‘q</p>
  if (variant === 'table') {
    return (
      <ul className="m-0 list-none border-t border-line p-0">
        {events.map((e, i) => (
          <li key={i} className="flex min-h-10 gap-3 border-b border-line py-[9px] text-sm">
            <time dateTime={e.created_at} className="w-11 shrink-0 text-ink-2 tabular-nums">
              {hhmm(e.created_at)}
            </time>
            <span>{eventTitle(e)}</span>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <ol className="m-0 list-none p-0">
      {events.map((e, i) => {
        const last = i === events.length - 1
        return (
          <li key={i} className="relative pb-3.5 pl-5">
            <span aria-hidden className={`absolute top-1.5 left-0 size-2 rounded-full ${last ? 'bg-navy' : 'bg-field'}`} />
            {!last && <span aria-hidden className="absolute top-[18px] -bottom-1 left-[3.5px] w-px bg-line" />}
            <div className="text-sm leading-5 font-medium">{eventTitle(e)}</div>
            <time dateTime={e.created_at} className="block text-xs leading-4 text-ink-2 tabular-nums">
              {relativeDayTime(e.created_at)}
            </time>
          </li>
        )
      })}
    </ol>
  )
}
