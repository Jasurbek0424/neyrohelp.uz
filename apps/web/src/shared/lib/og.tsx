import 'server-only'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'

/**
 * Dinamik OG rasm (1200×630) — brend ranglari, Onest shrifti.
 * Shrift tarmoqdan emas, lokal fayldan (next/og woff2 ni qo‘llamaydi → @fontsource/onest woff).
 */
export const ogSize = { width: 1200, height: 630 } as const
export const ogContentType = 'image/png'

const FONT_DIR = join(process.cwd(), 'node_modules', '@fontsource', 'onest', 'files')

type Font = { name: 'Onest' | 'Onest Cyrillic'; data: ArrayBuffer; weight: 400 | 600; style: 'normal' }
let fontsPromise: Promise<Font[]> | null = null

function loadFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all(
    (
      [
        ['latin', 600],
        ['cyrillic', 600],
        ['latin', 400],
        ['cyrillic', 400],
      ] as const
    ).map(async ([subset, weight]): Promise<Font> => {
      const buf = await readFile(join(FONT_DIR, `onest-${subset}-${weight}-normal.woff`))
      return { name: subset === 'latin' ? 'Onest' : 'Onest Cyrillic', data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, weight, style: 'normal' }
    }),
  ).catch((err: unknown) => {
    fontsPromise = null
    throw err
  })
  return fontsPromise as Promise<Font[]>
}

const C = { navy: '#13294B', deep: '#0C1C36', coral: '#E4572E', mist: '#C9D2E3', white: '#FFFFFF' }

export async function renderOgImage({ title, eyebrow, footer }: { title: string; eyebrow?: string; footer?: string }) {
  const fonts = await loadFonts()
  const text = title.length > 110 ? `${title.slice(0, 107).trim()}…` : title
  const size = text.length > 70 ? 54 : text.length > 40 ? 64 : 76

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 80px',
          background: C.navy,
          color: C.white,
          fontFamily: 'Onest, "Onest Cyrillic"',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="6" fill={C.white} />
            <path d="M10 22.5V9.5L22 22.5V9.5" fill="none" stroke={C.navy} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="9.5" r="2.7" fill={C.coral} />
          </svg>
          <div style={{ display: 'flex', fontSize: 38, fontWeight: 600, letterSpacing: '-0.02em' }}>
            Neyro<span style={{ fontWeight: 400 }}>Help</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {eyebrow ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, color: C.mist }}>
              <div style={{ width: 32, height: 3, background: C.coral }} />
              {eyebrow}
            </div>
          ) : null}
          <div style={{ display: 'flex', fontSize: size, fontWeight: 600, lineHeight: 1.08, letterSpacing: '-0.03em', maxWidth: 1000 }}>{text}</div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: 28,
            fontSize: 24,
            color: C.mist,
          }}
        >
          <span>{footer ?? ''}</span>
          <div style={{ display: 'flex', width: 14, height: 14, background: C.coral }} />
        </div>
      </div>
    ),
    { ...ogSize, fonts },
  )
}
