import type { components } from '@/shared/api/schema'

/** Tiplar OpenAPI'dan (`npm run api:types`) — qo‘lda yozilmaydi */
type S = components['schemas']

export type Role = S['Role']
/** `totp_required` — admin/editor 2FA o‘rnatmagan: frontend profilga majburan yo‘naltiradi */
export type Me = S['Me']
export type LoginBody = S['LoginIn']
export type LoginResponse = S['LoginOut']
export type UserEnvelope = S['UserEnvelope']
export type TotpSetup = S['TotpSetupOut']
export type PasswordBody = S['PasswordIn']

export const roleLabels: Record<Role, string> = {
  admin: 'Administrator',
  editor: 'Muharrir',
  operator: 'Operator',
}
