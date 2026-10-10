import type { ComponentProps, ReactNode } from 'react'

const alignCls = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

/** Haqiqiy <table> semantikasi, dizayndagi zich admin uslubi */
export function Table({ className = '', children, ...p }: ComponentProps<'table'>) {
  return (
    <table className={`w-full table-fixed border-collapse text-sm ${className}`} {...p}>
      {children}
    </table>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-(--am-bg) text-left text-xs font-medium text-ink-2">{children}</thead>
}

export function Th({ className = '', align = 'left', ...p }: ComponentProps<'th'> & { align?: 'left' | 'right' | 'center' }) {
  return <th scope="col" className={`h-10 border-b border-line px-3 font-medium first:pl-4 last:pr-4 ${alignCls[align]} ${className}`} {...p} />
}

export function Td({ className = '', align = 'left', ...p }: ComponentProps<'td'> & { align?: 'left' | 'right' | 'center' }) {
  return <td className={`border-b border-line px-3 align-middle first:pl-4 last:pr-4 ${alignCls[align]} ${className}`} {...p} />
}

export function Card({ className = '', ...p }: ComponentProps<'section'>) {
  return <section className={`rounded-card border border-line bg-white ${className}`} {...p} />
}
