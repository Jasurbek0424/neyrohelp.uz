'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'

/**
 * Admin sahifalari dinamik (nonce CSP) — viewport prefetch har yuklanishda menyudagi barcha
 * bo‘limlar uchun serverga RSC so‘rov yuboradi. Faqat hover/focus/touch'da prefetch qilamiz.
 */
export function HoverLink({ href, onPointerEnter, onFocus, onTouchStart, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter()
  const warm = () => router.prefetch(href)
  return (
    <Link
      {...rest}
      href={href}
      prefetch={false}
      onPointerEnter={(e) => {
        warm()
        onPointerEnter?.(e)
      }}
      onFocus={(e) => {
        warm()
        onFocus?.(e)
      }}
      onTouchStart={(e) => {
        warm()
        onTouchStart?.(e)
      }}
    />
  )
}
