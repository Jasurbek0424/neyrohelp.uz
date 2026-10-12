export function LogoMark({ size = 30, inverted = false }: { size?: number; inverted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable={false}>
      <rect width="32" height="32" rx="6" fill={inverted ? '#FFFFFF' : '#13294B'} />
      <path
        d="M10 22.5V9.5L22 22.5V9.5"
        fill="none"
        stroke={inverted ? '#13294B' : '#FFFFFF'}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="9.5" r="2.7" fill="#E4572E" />
    </svg>
  )
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark inverted={inverted} />
      <span className="text-[21px] font-semibold tracking-[-0.02em]">
        Neyro<span className={`font-normal ${inverted ? '' : 'text-navy'}`}>Help</span>
      </span>
    </span>
  )
}
