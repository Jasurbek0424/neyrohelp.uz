import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const base = (size = 16): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
})

export const ArrowRight = ({ size, ...p }: IconProps) => (
  <svg viewBox="0 0 16 16" {...base(size)} {...p}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
)

export const ArrowLeft = ({ size, ...p }: IconProps) => (
  <svg viewBox="0 0 16 16" {...base(size)} {...p}>
    <path d="M13 8H3M7 4L3 8l4 4" />
  </svg>
)

export const Plus = ({ size = 12, ...p }: IconProps) => (
  <svg viewBox="0 0 14 14" {...base(size)} {...p}>
    <path d="M7 1v12M1 7h12" />
  </svg>
)

export const Check = ({ size = 20, ...p }: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(size)} strokeWidth={1.8} {...p}>
    <path d="M4 10.5l4 4 8-9" />
  </svg>
)

export const PhoneIcon = ({ size = 20, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" {...base(size)} {...p}>
    <path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.6A1.5 1.5 0 0 1 5 4z" />
  </svg>
)

export const MenuIcon = ({ size = 20, ...p }: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(size)} {...p}>
    <path d="M3 7h14M3 13h14" />
  </svg>
)

export const CloseIcon = ({ size = 20, ...p }: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(size)} {...p}>
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
)

export const SearchIcon = ({ size = 18, ...p }: IconProps) => (
  <svg viewBox="0 0 20 20" {...base(size)} {...p}>
    <circle cx="9" cy="9" r="6" />
    <path d="M13.5 13.5L17 17" />
  </svg>
)

export const FileIcon = ({ size = 20, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" {...base(size)} {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
)

export const PinIcon = ({ size = 20, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" {...base(size)} {...p}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
)

export const MetroIcon = ({ size = 22, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" {...base(size)} {...p}>
    <path d="M4 19L8 6l4 8 4-8 4 13" />
  </svg>
)

export const BusIcon = ({ size = 22, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" {...base(size)} {...p}>
    <rect x="4" y="3" width="16" height="15" rx="2" />
    <path d="M4 11h16M8 18v3M16 18v3" />
    <circle cx="8" cy="14.5" r="0.8" />
    <circle cx="16" cy="14.5" r="0.8" />
  </svg>
)

export const CarIcon = ({ size = 22, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" {...base(size)} {...p}>
    <path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3zM5 11h14" />
  </svg>
)

export const TelegramIcon = ({ size = 18, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" {...base(size)} {...p}>
    <path d="M21 4L3 11l6 2 2 6 3-4 5 4z" />
    <path d="M9 13l12-9" />
  </svg>
)

export const LinkIcon = ({ size = 18, ...p }: IconProps) => (
  <svg viewBox="0 0 24 24" {...base(size)} {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
)
