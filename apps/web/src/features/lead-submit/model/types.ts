import type { components } from '@/shared/api/schema'

export type LeadPayload = components['schemas']['LeadIn']

export type LeadField = 'full_name' | 'phone' | 'consent'
export type FieldErrors = Partial<Record<LeadField, string>>

export type SubmitResult =
  | { ok: true }
  | { ok: false; kind: 'validation'; fields: LeadField[] }
  | { ok: false; kind: 'rate-limit' }
  | { ok: false; kind: 'error' }
