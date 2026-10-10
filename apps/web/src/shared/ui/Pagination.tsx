import Link from 'next/link'

import { ArrowLeft, ArrowRight } from './Icons'

type Props = {
  page: number
  totalPages: number
  hrefFor: (page: number) => string
  label: string
  prevLabel: string
  nextLabel: string
}

const box = 'flex size-10 items-center justify-center rounded-control text-[15px] font-medium transition-colors'

function pageList(page: number, total: number): (number | 'gap-start' | 'gap-end')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const nums = [...new Set([1, total, page - 1, page, page + 1])].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const out: (number | 'gap-start' | 'gap-end')[] = []
  nums.forEach((n, i) => {
    const prev = nums[i - 1]
    if (prev !== undefined && n - prev > 1) out.push(i < 3 ? 'gap-start' : 'gap-end')
    out.push(n)
  })
  return out
}

export function Pagination({ page, totalPages, hrefFor, label, prevLabel, nextLabel }: Props) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label={label} className="mt-14 flex justify-center">
      <ul className="flex items-center gap-2">
        <li>
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} rel="prev" aria-label={prevLabel} className={`${box} border border-line-strong hover:bg-sand`}>
              <ArrowLeft size={18} />
            </Link>
          ) : (
            <span aria-hidden className={`${box} border border-line text-field`}>
              <ArrowLeft size={18} />
            </span>
          )}
        </li>
        {pageList(page, totalPages).map((n) => (
          <li key={n}>
            {typeof n === 'number' ? (
              <Link
                href={hrefFor(n)}
                aria-current={n === page ? 'page' : undefined}
                className={`${box} ${n === page ? 'bg-navy text-white' : 'border border-line-strong hover:bg-sand'}`}
              >
                {n}
              </Link>
            ) : (
              <span aria-hidden className={`${box} text-ink-2`}>
                …
              </span>
            )}
          </li>
        ))}
        <li>
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} rel="next" aria-label={nextLabel} className={`${box} border border-line-strong hover:bg-sand`}>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <span aria-hidden className={`${box} border border-line text-field`}>
              <ArrowRight size={18} />
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}
