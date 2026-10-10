'use client'

import { useState } from 'react'

import type { LeadDetail } from '@/entities/lead'

import { useLeadActions } from '../model/useLeadActions'

/** Ichki izoh. Ota komponent `key={lead.id}` beradi — boshqa arizaga o‘tganda holat yangilanadi. */
export function LeadNoteForm({ lead }: { lead: Pick<LeadDetail, 'id' | 'admin_note'> }) {
  const { saveNote, updating } = useLeadActions()
  const [note, setNote] = useState(lead.admin_note ?? '')
  const [saved, setSaved] = useState(false)
  const dirty = note.trim() !== (lead.admin_note ?? '').trim()
  return (
    <div>
      <label htmlFor="dr-note" className="mb-1.5 block text-[13px] font-medium text-ink-2">
        Administrator izohi
      </label>
      <textarea
        id="dr-note"
        className="am-in h-16 w-full resize-none rounded-control border border-line-strong bg-white px-3 py-2.5 text-sm leading-[1.45] text-ink"
        placeholder="Ichki izoh. Bemorga ko‘rinmaydi."
        maxLength={4000}
        value={note}
        onChange={(e) => {
          setNote(e.target.value)
          setSaved(false)
        }}
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={!dirty || updating}
          onClick={async () => setSaved(await saveNote(lead, note))}
          className="am-btn-o h-8 cursor-pointer rounded-control border border-line-strong bg-white px-3 text-[13px] font-medium text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Izohni saqlash
        </button>
        <span role="status" className="text-xs text-(--am-ok)">
          {saved && !dirty ? 'Saqlandi' : ''}
        </span>
      </div>
    </div>
  )
}
