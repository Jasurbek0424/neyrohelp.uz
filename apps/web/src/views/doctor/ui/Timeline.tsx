import type { TimelineRow } from '@/entities/doctor'

export function Timeline({ title, rows }: { title: string; rows: TimelineRow[] }) {
  return (
    <div>
      <h3 className="text-[22px] font-semibold tracking-[-0.015em]">{title}</h3>
      <ul className="mt-5 border-t border-ink">
        {rows.map((r, i) => (
          <li key={`${r.years}-${r.place}-${i}`} className="grid grid-cols-[6.5rem_1fr] gap-x-4 border-b border-line-strong py-4 sm:grid-cols-[8rem_1fr]">
            <span className="text-[15px] text-ink-2 tabular-nums">{r.years}</span>
            <span>
              <span className="block font-semibold">{r.place}</span>
              {r.detail ? <span className="mt-1 block text-[15px] text-ink-2">{r.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
