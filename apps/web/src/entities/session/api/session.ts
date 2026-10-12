import { queryOptions } from '@tanstack/react-query'

import { api, ApiError, hasSessionCookie } from '@/shared/api/client'

import type { LoginBody, LoginResponse, Me, PasswordBody, TotpSetup, UserEnvelope } from '../model/types'

/** Barcha admin query key'lari 'admin' bilan boshlanadi → logout'da `queryClient.clear()` */
export const sessionKeys = {
  all: ['admin', 'session'] as const,
  me: () => [...sessionKeys.all, 'me'] as const,
}

/**
 * `api()` /admin/auth/* yo‘llarida avtomatik refresh qilmaydi — shuning uchun /auth/me 401 bo‘lsa
 * bu yerda bir marta /auth/refresh chaqiramiz (sahifa 15 daqiqadan keyin ochilganda).
 */
export async function fetchMe(signal?: AbortSignal): Promise<Me> {
  if (!hasSessionCookie()) throw new ApiError(401, 'not_authenticated')
  try {
    return await api<Me>('/admin/auth/me', { signal })
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      const r = await api<UserEnvelope>('/admin/auth/refresh', { method: 'POST', signal })
      return r.user
    }
    throw e
  }
}

export const meQueryOptions = () =>
  queryOptions({
    queryKey: sessionKeys.me(),
    queryFn: ({ signal }) => fetchMe(signal),
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: true,
  })

export const login = (body: LoginBody) => api<LoginResponse>('/admin/auth/login', { method: 'POST', body })
export const logoutRequest = () => api<void>('/admin/auth/logout', { method: 'POST' })
export const totpSetup = () => api<TotpSetup>('/admin/auth/totp/setup', { method: 'POST' })
export const totpEnable = (code: string) => api<Me>('/admin/auth/totp/enable', { method: 'POST', body: { code } })
export const telegramLink = (telegram_id: number) => api<void>('/admin/auth/telegram/link', { method: 'POST', body: { telegram_id } })
export const telegramConfirm = (code: string) => api<Me>('/admin/auth/telegram/confirm', { method: 'POST', body: { code } })
export const changePassword = (body: PasswordBody) => api<void>('/admin/auth/password', { method: 'POST', body })
