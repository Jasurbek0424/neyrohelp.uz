import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger-text'
type Size = 'md' | 'sm' | 'lg' | 'xl'

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-55'
const variants: Record<Variant, string> = {
  primary: 'am-btn bg-navy text-white',
  secondary: 'am-btn-o border border-line-strong bg-white text-ink',
  ghost: 'am-ghost bg-transparent text-ink',
  'danger-text': 'am-del bg-transparent text-ink-2 px-0!',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-4 text-[15px]',
  xl: 'h-13 px-5 text-base',
}

export function adminButtonClass(variant: Variant = 'secondary', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`
}

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode }

export function AdminButton({ variant, size, className = '', type = 'button', ...p }: Common & ComponentProps<'button'>) {
  return <button type={type} className={adminButtonClass(variant, size, className)} {...p} />
}

export function AdminButtonLink({ variant, size, className = '', ...p }: Common & ComponentProps<typeof Link>) {
  return <Link className={adminButtonClass(variant, size, className)} {...p} />
}

/** Kvadrat ikonka-tugma: aria-label majburiy */
export function IconButton({
  label,
  className = '',
  size = 32,
  bordered = true,
  type = 'button',
  ...p
}: ComponentProps<'button'> & { label: string; size?: number; bordered?: boolean }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={`am-btn-o inline-flex shrink-0 cursor-pointer items-center justify-center rounded-control bg-white text-ink-2 disabled:cursor-not-allowed disabled:opacity-50 ${bordered ? 'border border-line' : 'border-0 bg-transparent'} ${className}`}
      {...p}
    />
  )
}
