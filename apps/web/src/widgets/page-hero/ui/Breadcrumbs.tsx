import Link from 'next/link'

import { absoluteUrl } from '@/shared/lib/seo'
import { JsonLd } from '@/shared/ui/JsonLd'

export type Crumb = { href?: string; label: string }

/**
 * Ko‘rinadigan breadcrumb + BreadcrumbList JSON-LD (bir xil ma’lumotdan).
 * Oxirgi element joriy sahifa (havolasiz) — `linkLast` bilan havola bo‘lib qoladi;
 * `tail` — faqat JSON-LD ga qo‘shiladigan joriy sahifa (masalan maqola nomi).
 */
export function Breadcrumbs({ items, label, linkLast = false, tail }: { items: Crumb[]; label: string; linkLast?: boolean; tail?: Crumb }) {
  const ld = tail ? [...items, tail] : items
  return (
    <>
      <nav aria-label={label} className="text-sm text-ink-2">
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((c, i) => (
            <li key={`${c.label}-${i}`} className="flex items-center gap-2">
              {c.href && (linkLast || i < items.length - 1) ? (
                <Link href={c.href} className="hover:text-ink">
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink">
                  {c.label}
                </span>
              )}
              {i < items.length - 1 ? <span aria-hidden>/</span> : null}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: ld.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.label,
            item: c.href ? absoluteUrl(c.href) : undefined,
          })),
        }}
      />
    </>
  )
}
