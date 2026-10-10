import { useId, type ComponentProps, type ReactNode } from 'react'

import { ChevronIcon } from './icons'

export const inputClass =
  'am-in h-10 w-full rounded-control border border-line-strong bg-white px-3 text-sm text-ink placeholder:text-(--am-muted) disabled:bg-sand disabled:text-ink-2 aria-[invalid=true]:border-danger'

type FieldProps = {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  /** label ustida o‘ngda (hisoblagich va h.k.) */
  aside?: ReactNode
  className?: string
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
}

/** label + kontrol + yordam/xato matni. Kontrolga id va aria-describedby beriladi. */
export function Field({ label, hint, error, aside, className = '', children }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errId = `${id}-err`
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      {(label || aside) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label ? (
            <label htmlFor={id} className="text-[13px] font-medium text-ink">
              {label}
            </label>
          ) : (
            <span />
          )}
          {aside}
        </div>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <p id={errId} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-ink-2">
          {hint}
        </p>
      )}
    </div>
  )
}

export function Input({ className = '', ...p }: ComponentProps<'input'>) {
  return <input className={`${inputClass} ${className}`} {...p} />
}

export function Textarea({ className = '', ...p }: ComponentProps<'textarea'>) {
  return <textarea className={`${inputClass} h-auto resize-none py-2.5 leading-[1.5] ${className}`} {...p} />
}

export function Select({ className = '', wrapperClassName = '', children, ...p }: ComponentProps<'select'> & { wrapperClassName?: string }) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select className={`${inputClass} cursor-pointer appearance-none pr-7 ${className}`} {...p}>
        {children}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-2">
        <ChevronIcon />
      </span>
    </div>
  )
}

/** Ichida suffiks/prefiks bor kiritish (masalan «so‘m», «/shifokorlar/») */
export function AffixInput({
  prefix,
  suffix,
  className = '',
  inputClassName = '',
  invalid,
  ...p
}: Omit<ComponentProps<'input'>, 'prefix'> & { prefix?: ReactNode; suffix?: ReactNode; inputClassName?: string; invalid?: boolean }) {
  return (
    <div
      className={`am-wrap flex h-10 items-center overflow-hidden rounded-control border bg-white ${invalid ? 'border-danger' : 'border-line-strong'} ${className}`}
    >
      {prefix && <span className="flex h-full items-center border-r border-line bg-(--am-bg) pr-2 pl-2.5 text-[13px] text-ink-2">{prefix}</span>}
      <input aria-invalid={invalid || undefined} className={`h-full min-w-0 flex-1 border-0 bg-transparent px-2.5 text-sm text-ink outline-none ${inputClassName}`} {...p} />
      {suffix && <span className="pr-3 text-[13px] text-ink-2">{suffix}</span>}
    </div>
  )
}

export function Checkbox({ label, className = '', ...p }: ComponentProps<'input'> & { label: ReactNode }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 text-sm ${className}`}>
      <input type="checkbox" className="m-0 size-4 accent-navy" {...p} />
      {label}
    </label>
  )
}
