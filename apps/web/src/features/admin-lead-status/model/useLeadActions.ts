'use client'

import { useQuery } from '@tanstack/react-query'

import { useTakeLead, useUpdateLead, type LeadDetail, type LeadRow, type LeadStatus } from '@/entities/lead'
import { meQueryOptions } from '@/entities/session'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { toast } from '@/shared/ui/admin/Toast'

/**
 * Arizaga amallar. Yangi arizaning statusi o‘zgartirilsa — avval «olish» (taken_by yoziladi),
 * keyin status. Har ikkisi optimistic, xato bo‘lsa rollback + toast.
 */
export function useLeadActions() {
  const { data: me } = useQuery(meQueryOptions())
  const take = useTakeLead(me?.name)
  const update = useUpdateLead()

  /**
   * mutateAsync — «Olish» tugmasi optimistic yangilanishda yo‘qoladi (unmount); `mutate(…, {onSuccess})`
   * callback'lari unmount'dan keyin chaqirilmaydi, promise esa baribir yakunlanadi → toast har doim chiqadi.
   */
  const takeLead = async (lead: Pick<LeadRow, 'id' | 'full_name'>) => {
    try {
      await take.mutateAsync(lead.id)
      toast.success(`${lead.full_name} — siz oldingiz`)
      return true
    } catch (e) {
      toast.error(errorMessage(e))
      return false
    }
  }

  const setStatus = async (lead: Pick<LeadRow, 'id' | 'status'>, status: LeadStatus, note?: string | null) => {
    try {
      if (lead.status === 'new' && status !== 'spam') await take.mutateAsync(lead.id)
      await update.mutateAsync({ id: lead.id, patch: note === undefined ? { status } : { status, admin_note: note } })
      return true
    } catch (e) {
      toast.error(errorMessage(e))
      return false
    }
  }

  const saveNote = async (lead: Pick<LeadDetail, 'id'>, note: string) => {
    try {
      await update.mutateAsync({ id: lead.id, patch: { admin_note: note.trim() || null } })
      return true
    } catch (e) {
      toast.error(errorMessage(e))
      return false
    }
  }

  return { takeLead, setStatus, saveNote, taking: take.isPending, updating: update.isPending, takingId: take.isPending ? take.variables : undefined }
}
