import type { ReactNode } from 'react'

import { Breadcrumbs, type Crumb } from './Breadcrumbs'

/** Ichki sahifa sarlavhasi: breadcrumb, chapda H1, o‘ngda lead, pastida qalin chiziq */
export function PageHero({
  crumbs,
  crumbsLabel,
  title,
  lead,
  children,
  divider = true,
}: {
  crumbs: Crumb[]
  crumbsLabel: string
  title: string
  lead?: string | null
  children?: ReactNode
  /** false — pastki chiziqni keyingi blok (masalan filtr) o‘zi chizadi */
  divider?: boolean
}) {
  return (
    <section className="container-site pt-10 lg:pt-16">
      <Breadcrumbs items={crumbs} label={crumbsLabel} />
      <div className="grid-site mt-8 items-end gap-y-6 pb-10 lg:pb-14">
        <h1 className="col-span-4 text-h1 font-semibold text-balance lg:col-span-7">{title}</h1>
        {lead ? <p className="col-span-4 text-[17px] leading-relaxed text-ink-2 lg:col-span-4 lg:col-start-9">{lead}</p> : null}
      </div>
      {children}
      {divider ? <div className="border-b border-ink" /> : null}
    </section>
  )
}
