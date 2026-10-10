import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

/** Dizayndagi admin ikonkalari (24×24, stroke 1.6) */
const paths = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  leads: 'M4 5h16v11H8l-4 4zM8 9h8M8 12h5',
  doctors: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  services: 'M4 6h16M4 12h16M4 18h10',
  posts: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  home: 'M4 11l8-7 8 7v9h-5v-6h-6v6H4z',
  clinic: 'M4 21V6l8-3 8 3v15M9 21v-5h6v5M10 9h4M12 7v4',
  settings: 'M4 7h9M17 7h3M15 5v4M4 17h3M11 17h9M9 15v4',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M17 3.5a4 4 0 0 1 0 7M22 21v-1a6 6 0 0 0-4-5.6',
  profile: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  download: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14',
  upload: 'M12 15V4M7.5 8.5L12 4l4.5 4.5M4 15v4h16v-4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8v.01',
  alert: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5v5M12 16v.5',
  tgOk: 'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0zM8.5 12.2l2.4 2.4 4.6-5',
  tgErr: 'M12 4l9 16H3zM12 10v4M12 17v.5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff:
    'M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.7M6.5 7.5A17 17 0 0 0 2 12s4 7 10 7c1.4 0 2.8-.3 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2',
  back: 'M15 5l-7 7 7 7',
  menu: 'M4 6h16M4 12h16M4 18h16',
  collapse: 'M15 5l-7 7 7 7M20 4v16',
  expand: 'M9 5l7 7-7 7M4 4v16',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  olist: 'M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M4 14c0-1.3 2.8-1.3 2.8 0 0 1.1-2.8 2.2-2.8 3.4H7',
  quote: 'M5 11V9a4 4 0 0 1 4-4M5 11h4v6H5zM14 11V9a4 4 0 0 1 4-4M14 11h4v6h-4z',
  telegram: 'M21 3L3 10.5l6 2.25L11.25 19 14 15l4.5 3.5zM9 12.75L21 3',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  key: 'M14 10a4 4 0 1 0-3.5 4L12 15.5h2v2h2v2h3v-3l-5.2-5.2A4 4 0 0 0 14 10z',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z',
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 18, strokeWidth = 1.6, ...p }: P & { name: IconName }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...p}
    >
      <path d={paths[name]} />
    </svg>
  )
}

export const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden focusable={false} className="shrink-0">
    <circle cx="9" cy="9" r="6" />
    <path d="M13.5 13.5L17 17" strokeLinecap="round" />
  </svg>
)

export const PlusIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden focusable={false}>
    <path d="M7 1v12M1 7h12" />
  </svg>
)

export const CheckIcon = ({ size = 14, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false}>
    <path d="M4 10.5l4 4 8-9" />
  </svg>
)

export const ExternalIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false}>
    <path d="M6 3h7v7M13 3L4 12" />
  </svg>
)

export const ChevronIcon = ({ dir = 'down', size = 12 }: { dir?: 'down' | 'left' | 'right'; size?: number }) => {
  const d = dir === 'down' ? 'M2 4.5l4 4 4-4' : dir === 'left' ? 'M7.5 2l-4 4 4 4' : 'M4.5 2l4 4-4 4'
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false}>
      <path d={d} />
    </svg>
  )
}

export const CloseIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden focusable={false}>
    <path d="M3 3l10 10M13 3L3 13" />
  </svg>
)

export const GripIcon = () => (
  <svg width="14" height="18" viewBox="0 0 14 18" aria-hidden focusable={false} fill="#545A63">
    {[4, 9, 14].map((y) => (
      <g key={y}>
        <circle cx="4" cy={y} r="1.4" />
        <circle cx="10" cy={y} r="1.4" />
      </g>
    ))}
  </svg>
)
