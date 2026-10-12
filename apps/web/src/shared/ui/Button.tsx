import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'outline' | 'white' | 'outline-light'
type Size = 'md' | 'sm'

const variants: Record<Variant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-deep',
  outline: 'border border-ink text-ink hover:bg-ink hover:text-white',
  white: 'bg-white text-navy hover:bg-navy-soft',
  'outline-light': 'border border-white/40 text-white hover:border-white hover:bg-white/10',
}

const sizes: Record<Size, string> = {
  md: 'h-13 px-6 text-base gap-3',
  sm: 'h-11 px-5 text-[15px] gap-2',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return [
    'arrow-nudge inline-flex shrink-0 items-center justify-center rounded-control font-medium whitespace-nowrap',
    'transition-[color,background-color,border-color,transform] duration-200 ease-(--ease-soft) active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-field',
    variants[variant],
    sizes[size],
    extra,
  ].join(' ')
}

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode }

export function ButtonLink({ variant, size, className = '', ...props }: Common & ComponentProps<typeof Link>) {
  return <Link className={buttonClass(variant, size, className)} {...props} />
}

export function Button({ variant, size, className = '', ...props }: Common & ComponentProps<'button'>) {
  return <button className={buttonClass(variant, size, className)} {...props} />
}
