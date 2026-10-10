import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import type { ReactNode } from 'react'

import { AdminProviders } from '@/app/providers'

import '@/app/styles/globals.css'
import '@/app/styles/admin.css'

export const metadata: Metadata = {
  title: { default: 'Boshqaruv paneli · NeyroMed', template: '%s · NeyroMed admin' },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: 'same-origin',
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#13294B' }

/** Admin SPA — alohida root layout (public sayt bundle'iga kirmaydi). Nonce proxy.ts'dan (qat'iy CSP). */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="uz" data-scroll-behavior="smooth">
      <body className="admin-root min-h-dvh">
        <AdminProviders nonce={nonce}>{children}</AdminProviders>
      </body>
    </html>
  )
}
