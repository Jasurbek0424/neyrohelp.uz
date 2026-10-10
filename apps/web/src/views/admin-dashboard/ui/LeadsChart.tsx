'use client'

import { useState } from 'react'

import type { Dashboard } from '@/entities/lead'
import { ddmm } from '@/shared/lib/admin/time'

const PLOT = 183

/** Eng katta qiymatdan yuqoridagi «chiroyli» chegara: 3 ta teng qadam (0, s, 2s, 3s) */
function scale(max: number) {
  const step = Math.max(1, Math.ceil(max / 3))
  return { top: step * 3, ticks: [step * 3, step * 2, step, 0] }
}

/**
 * «Arizalar · so‘nggi 14 kun» — div ustunlar (kutubxonasiz). Pastda «yozildi» (ko‘k), ustida qolganlari.
 * Ustun fokuslanadi (Tab) yoki sichqoncha bilan — tooltip; ekran o‘quvchilari uchun yashirin jadval.
 */
export function LeadsChart({ chart }: { chart: Dashboard['chart'] }) {
  const [hover, setHover] = useState(-1)
  const { top, ticks } = scale(Math.max(0, ...chart.map((d) => d.total)))
  const px = PLOT / top

  return (
    <section aria-labelledby="chart-title" className="flex h-[340px] flex-col rounded-card border border-line bg-white px-6 py-5">
      <div className="flex items-center justify-between gap-4">
        <h2 id="chart-title" className="m-0 text-base font-semibold">
          Arizalar · so‘nggi 14 kun
        </h2>
        <div aria-hidden className="flex gap-4 text-[13px] text-ink-2 max-sm:hidden">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] bg-(--am-chart)" />
            Qabulga yozildi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] bg-field" />
            Boshqa holatlar
          </span>
        </div>
      </div>

      <div className="relative mt-5 flex flex-1 gap-3" onMouseLeave={() => setHover(-1)}>
        <div aria-hidden className="relative w-5 text-xs text-ink-2">
          {ticks.map((t, i) => (
            <span key={i} className="absolute right-0 tabular-nums" style={{ top: Math.round((PLOT / 3) * i) - 8 }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden className="absolute inset-x-0 border-t border-(--am-grid)" style={{ top: Math.round((PLOT / 3) * i) }} />
          ))}
          <div aria-hidden className="absolute inset-x-0 border-t border-field" style={{ top: PLOT }} />
          <div className="absolute inset-x-0 top-0 grid items-end gap-2.5 max-sm:gap-1" style={{ height: PLOT, gridTemplateColumns: `repeat(${chart.length || 14}, minmax(0, 1fr))` }}>
            {chart.map((d, i) => {
              const rest = d.total - d.booked
              const on = i === hover
              const dim = hover !== -1 && !on
              return (
                <div
                  key={d.date}
                  tabIndex={0}
                  aria-label={`${ddmm(d.date)}: jami ${d.total}, yozildi ${d.booked}`}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(-1)}
                  className="relative flex h-full flex-col items-center justify-end rounded-[4px] outline-offset-2"
                >
                  {rest > 0 && <div className="w-full max-w-[30px] rounded-t-[4px]" style={{ height: Math.max(0, Math.round(rest * px) - 2), marginBottom: 2, background: dim ? 'var(--am-chart-rest-dim)' : 'var(--color-field)' }} />}
                  {d.booked > 0 && (
                    <div className="w-full max-w-[30px]" style={{ height: Math.round(d.booked * px), background: dim ? 'var(--am-chart-dim)' : 'var(--am-chart)', borderRadius: rest > 0 ? 0 : '4px 4px 0 0' }} />
                  )}
                  {on && (
                    <div role="tooltip" className="pointer-events-none absolute left-1/2 z-[2] w-[150px] -translate-x-1/2 rounded-control bg-ink px-3 py-2.5 text-xs leading-normal text-white" style={{ bottom: Math.round(d.total * px) + 10 }}>
                      <div className="mb-1 font-semibold">
                        {ddmm(d.date)}.{d.date.slice(0, 4)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-mist">Jami</span>
                        <span>{d.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-mist">Yozildi</span>
                        <span>{d.booked}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div aria-hidden className="absolute inset-x-0 grid gap-2.5 text-center text-xs text-ink-2 max-sm:gap-1" style={{ top: PLOT + 9, gridTemplateColumns: `repeat(${chart.length || 14}, minmax(0, 1fr))` }}>
            {chart.map((d, i) => (
              <span key={d.date}>{i % 2 === 0 ? ddmm(d.date) : ''}</span>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Arizalar kunlar bo‘yicha</caption>
        <thead>
          <tr>
            <th scope="col">Sana</th>
            <th scope="col">Jami</th>
            <th scope="col">Yozildi</th>
          </tr>
        </thead>
        <tbody>
          {chart.map((d) => (
            <tr key={d.date}>
              <th scope="row">{ddmm(d.date)}</th>
              <td>{d.total}</td>
              <td>{d.booked}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
