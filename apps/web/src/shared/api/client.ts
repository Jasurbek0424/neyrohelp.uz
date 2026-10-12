'use client'

import { API_BASE } from '@/shared/config/env'

/**
 * Brauzer uchun fetch (admin SPA va ariza formasi).
 * - cookie'lar bilan (HttpOnly sessiya), same-origin
 * - mutatsiyalarda X-CSRF-Token (nm_csrf cookie'dan)
 * - 401 bo‘lsa bitta umumiy refresh (single-flight), keyin so‘rov qayta yuboriladi
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public errors?: { loc: (string | number)[]; type: string }[],
  ) {
    super(detail)
  }
}

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

/**
 * nm_csrf refresh cookie bilan bir xil muddatda yashaydi va logout'da o‘chiriladi —
 * u yo‘q bo‘lsa sessiya ham yo‘q (me/refresh'ga 401 uchun so‘rov yuborish shart emas).
 */
export const hasSessionCookie = () => readCookie('nm_csrf') !== undefined

let refreshing: Promise<boolean> | null = null
let onSessionExpired: (() => void) | null = null

/** Admin ilovasi sessiya tugaganda nima qilishni beradi (kesh tozalash + login'ga yo‘naltirish) */
export function setSessionExpiredHandler(fn: () => void) {
  onSessionExpired = fn
}

async function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${API_BASE}/admin/auth/refresh`, { method: 'POST', credentials: 'same-origin' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      setTimeout(() => (refreshing = null), 0)
    })
  return refreshing
}

type Options = {
  method?: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
  /** multipart (FormData) yuborish */
  form?: FormData
  retry?: boolean
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const method = opts.method ?? 'GET'
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }
  const headers: Record<string, string> = { accept: 'application/json' }
  if (opts.body !== undefined) headers['content-type'] = 'application/json'
  if (UNSAFE.has(method)) {
    const csrf = readCookie('nm_csrf')
    if (csrf) headers['x-csrf-token'] = decodeURIComponent(csrf)
  }

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'same-origin',
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    signal: opts.signal,
  })

  if (res.status === 401 && opts.retry !== false && !path.startsWith('/admin/auth/')) {
    if (await refreshSession()) return api<T>(path, { ...opts, retry: false })
    onSessionExpired?.()
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data?.detail ?? 'error', data?.errors)
  return data as T
}
