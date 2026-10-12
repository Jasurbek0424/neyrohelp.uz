import type { ReactNode } from 'react'

/** Coral qisqa chiziq + kichik yorliq (dizayndagi section label) */
export function SectionLabel({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <div className={`flex items-center gap-3 text-sm font-medium ${light ? 'text-mist' : 'text-ink-2'}`}>
      <span aria-hidden className="line-grow h-0.5 w-6 bg-coral" />
      {children}
    </div>
  )
}

/** Seksiya sarlavhasi: chapda yorliq + H2, o‘ngda ixtiyoriy matn yoki havola */
export function SectionHeader({
  label,
  title,
  aside,
  id,
  light = false,
}: {
  label: string
  title: string
  aside?: ReactNode
  id?: string
  light?: boolean
}) {
  return (
    <div className="reveal grid-site items-end gap-y-6">
      <div className="col-span-4 lg:col-span-7">
        <SectionLabel light={light}>{label}</SectionLabel>
        <h2 id={id} className="mt-5 text-h2 font-semibold text-balance">
          {title}
        </h2>
      </div>
      {aside ? <div className="col-span-4 flex flex-col items-start gap-4 lg:col-span-4 lg:col-start-9">{aside}</div> : null}
    </div>
  )
}
