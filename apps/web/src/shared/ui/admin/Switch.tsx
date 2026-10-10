'use client'

import { useId } from 'react'

type Props = {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

/** role="switch" tugma — dizayndagi 40×24 (sm: 40×22) kvadratroq kalit */
export function Switch({ checked, onChange, label, description, disabled, size = 'md' }: Props) {
  const id = useId()
  const h = size === 'sm' ? 22 : 24
  const knob = size === 'sm' ? 16 : 18
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span id={id} className="text-sm font-medium">
          {label}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={id}
          aria-describedby={description ? `${id}-d` : undefined}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          style={{ height: h }}
          className={`relative w-10 shrink-0 cursor-pointer rounded-control border-0 p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-navy' : 'bg-field'}`}
        >
          <span
            className="absolute top-[3px] rounded-[4px] bg-white transition-[left] duration-150"
            style={{ width: knob, height: knob, left: checked ? 40 - knob - 3 : 3 }}
          />
        </button>
      </div>
      {description && (
        <p id={`${id}-d`} className="mt-1 text-xs text-ink-2">
          {description}
        </p>
      )}
    </div>
  )
}
