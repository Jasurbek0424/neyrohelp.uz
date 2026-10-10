'use client'

import { useState } from 'react'

import type { LeadDetail, LeadStatus } from '@/entities/lead'
import { CheckIcon } from '@/shared/ui/admin/icons'

import { useLeadActions } from '../model/useLeadActions'

const results: { value: LeadStatus; label: string }[] = [
  { value: 'booked', label: 'Yozildi' },
  { value: 'no_answer', label: 'Javob bermadi' },
  { value: 'declined', label: 'Rad etdi' },
  { value: 'callback', label: 'Keyinroq qo‘ng‘iroq' },
]

/** A8: «Natija» radio guruhi + izoh + pastdagi sticky «Saqlash» */
export function MobileLeadForm({ lead }: { lead: Pick<LeadDetail, 'id' | 'status' | 'admin_note'> }) {
  const { setStatus, saveNote, updating, taking } = useLeadActions()
  const initial = results.some((r) => r.value === lead.status) ? lead.status : null
  const [pick, setPick] = useState<LeadStatus | null>(initial)
  const [note, setNote] = useState(lead.admin_note ?? '')
  const [saved, setSaved] = useState(false)
  const noteDirty = note.trim() !== (lead.admin_note ?? '').trim()
  const statusDirty = pick !== null && pick !== lead.status
  const canSave = (statusDirty || noteDirty) && !updating && !taking

  const save = async () => {
    const ok = statusDirty ? await setStatus(lead, pick!, noteDirty ? note.trim() || null : undefined) : await saveNote(lead, note)
    setSaved(ok)
  }

  return (
    <>
      <section aria-labelledby="r-title" className="mt-6">
        <div className="flex items-baseline justify-between">
          <h3 id="r-title" className="m-0 text-base font-semibold">
            Natija
          </h3>
          <span className="text-xs text-ink-2">{pick ? '' : 'Saqlash uchun tanlang'}</span>
        </div>
        <div role="radiogroup" aria-labelledby="r-title" className="mt-2.5 grid grid-cols-2 gap-2">
          {results.map((r) => {
            const on = pick === r.value
            return (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setPick(r.value)
                  setSaved(false)
                }}
                className={`flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-control border px-3 py-2 text-center text-[15px] leading-tight ${on ? 'border-navy bg-navy font-semibold text-white' : 'border-line-strong bg-white font-medium text-ink'}`}
              >
                {on && <CheckIcon size={16} />}
                {r.label}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-5">
        <label htmlFor="m-note" className="block text-[13px] font-medium">
          Izoh
        </label>
        <textarea
          id="m-note"
          rows={3}
          maxLength={4000}
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            setSaved(false)
          }}
          placeholder="Masalan: ertaga 15:00 da qayta qo‘ng‘iroq qilish"
          className="am-in mt-1.5 block h-24 w-full resize-none rounded-control border border-line-strong bg-white px-3 py-2.5 text-base leading-[1.45] text-ink"
        />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white px-4 py-3">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className={`h-13 w-full rounded-control text-base font-medium ${canSave ? 'am-btn cursor-pointer border-0 bg-navy text-white' : 'cursor-not-allowed border border-line bg-(--am-neutral-soft) text-ink-2'}`}
        >
          {updating || taking ? 'Saqlanmoqda…' : saved && !canSave ? 'Saqlandi' : 'Saqlash'}
        </button>
        <div role="status" className="sr-only">
          {saved ? 'Natija saqlandi' : ''}
        </div>
      </div>
    </>
  )
}
