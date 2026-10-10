import { API_BASE } from '@/shared/config/env'

import type { LeadPayload, SubmitResult } from '../model/types'
import { fieldsFrom422 } from '../model/validate'

/** Ariza yuborish: POST /api/v1/public/leads (same-origin, JSON) */
export async function submitLead(payload: LeadPayload, signal?: AbortSignal): Promise<SubmitResult> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/public/leads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
      signal,
    })
  } catch {
    return { ok: false, kind: 'error' }
  }
  if (res.ok) return { ok: true }
  if (res.status === 429) return { ok: false, kind: 'rate-limit' }
  if (res.status === 422) {
    const fields = fieldsFrom422(await res.json().catch(() => null))
    return fields.length ? { ok: false, kind: 'validation', fields } : { ok: false, kind: 'error' }
  }
  return { ok: false, kind: 'error' }
}
