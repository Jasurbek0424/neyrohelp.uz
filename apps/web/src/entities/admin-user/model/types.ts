import type { components } from '@/shared/api/schema'

/** Tiplar OpenAPI'dan (backend: UserOut, UserIn, UserPatch, AuditOut). GET /users — sahifalanmagan ro‘yxat */
type S = components['schemas']

export type AdminUser = S['UserOut']
export type UserInput = S['UserIn']
export type UserPatch = S['UserPatch']
export type AuditEntry = S['AuditOut']
export type AuditPage = S['Page_AuditOut_']
