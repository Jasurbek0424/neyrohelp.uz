import { NextResponse, type NextRequest } from 'next/server'

import { defaultLocale, isLocale } from '@/shared/i18n/config'

/**
 * 1) Tilsiz public manzil → /uz/... (yoki cookie'dagi til)
 * 2) /admin — qat'iy nonce CSP (admin sahifalari baribir dinamik, SEO kerak emas)
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
    const isDev = process.env.NODE_ENV !== 'production'
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
      `style-src 'self' 'unsafe-inline'`,
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ')
    const headers = new Headers(request.headers)
    headers.set('x-nonce', nonce)
    headers.set('content-security-policy', csp)
    const res = NextResponse.next({ request: { headers } })
    res.headers.set('Content-Security-Policy', csp)
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  const first = pathname.split('/')[1]
  if (isLocale(first)) return NextResponse.next()

  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url, 308)
}

export const config = {
  matcher: ['/((?!api|_next|media|.*\\..*).*)'],
}
