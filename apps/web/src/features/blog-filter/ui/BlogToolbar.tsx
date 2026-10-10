import Link from 'next/link'
import type { FormEventHandler } from 'react'

import { SearchIcon } from '@/shared/ui/Icons'

import { CATEGORY_PARAM, blogHref } from '../model/params'

type Category = { slug: string; title: string }

type Props = {
  basePath: string
  categories: Category[]
  activeSlug?: string
  query?: string
  onSearch?: FormEventHandler<HTMLFormElement>
  labels: { all: string; nav: string; search: string; placeholder: string }
}

/**
 * Blog filtri: kategoriya tablari (havolalar) + qidiruv (GET forma — JS'siz ham ishlaydi).
 * Holat URL'da (?kategoriya=…&q=…), ulashsa bo‘ladi.
 */
export function BlogToolbar({ basePath, categories, activeSlug, query, onSearch, labels }: Props) {
  const tabs = [{ key: 'all', label: labels.all, href: blogHref(basePath, { q: query }), active: !activeSlug }].concat(
    categories.map((c) => ({
      key: c.slug,
      label: c.title,
      href: blogHref(basePath, { category: c.slug, q: query }),
      active: c.slug === activeSlug,
    })),
  )

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
      <nav aria-label={labels.nav} className="-mx-5 overflow-x-auto border-b border-line px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-1 lg:border-b-0 lg:px-0">
        <ul className="flex gap-7">
          {tabs.map((tab) => (
            <li key={tab.key} className="shrink-0">
              <Link
                href={tab.href}
                scroll={false}
                aria-current={tab.active ? 'page' : undefined}
                className={`inline-block border-b-2 py-3.5 text-base font-medium whitespace-nowrap transition-colors ${
                  tab.active ? 'border-coral text-ink' : 'border-transparent text-ink-2 hover:text-ink'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <form method="get" action={basePath} role="search" onSubmit={onSearch} className="relative w-full pb-6 lg:w-80 lg:pb-3">
        {activeSlug ? <input type="hidden" name={CATEGORY_PARAM} value={activeSlug} /> : null}
        <input
          type="search"
          name="q"
          defaultValue={query}
          minLength={2}
          maxLength={80}
          aria-label={labels.search}
          placeholder={labels.placeholder}
          className="h-11 w-full rounded-control border border-field bg-white pr-4 pl-11 text-base text-ink placeholder:text-ink-2"
        />
        <SearchIcon className="pointer-events-none absolute top-5.5 left-4 -translate-y-1/2 text-ink-2" />
      </form>
    </div>
  )
}
