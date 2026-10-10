import type { NextConfig } from 'next'

const API = process.env.API_INTERNAL_URL || 'http://127.0.0.1:8100'
// Dev yoki Caddy'siz lokal production testi (API_PROXY=1) uchun API va media'ni Next proksilaydi
const proxyApi = process.env.NODE_ENV !== 'production' || process.env.API_PROXY === '1'

// Public sahifalar uchun asosiy xavfsizlik headerlari. /admin uchun qat'iy nonce CSP proxy.ts da.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  agentRules: false,
  compress: true,
  images: {
    // Rasmlar backend'da oldindan webp o‘lchamlarga kesiladi (480/960/1600) — Next qayta optimizatsiya qilmaydi
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['@tanstack/react-query', 'zustand'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
  // Dev'da API va media'ni Next orqali proksilaymiz; production'da buni Caddy qiladi
  async rewrites() {
    return proxyApi
      ? [
          { source: '/api/v1/:path*', destination: `${API}/api/v1/:path*` },
          { source: '/media/:path*', destination: `${API}/media/:path*` },
        ]
      : []
  },
}

export default nextConfig
