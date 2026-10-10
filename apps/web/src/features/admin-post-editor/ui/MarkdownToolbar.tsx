'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

import { Icon, PlusIcon } from '@/shared/ui/admin/icons'

import { insertBlock, prefixLines, wrap, type EditResult } from '../lib/edit'
import { WARNING_BLOCK } from '../model/draft'

type Props = {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (v: string) => void
  onInsertImage?: () => void
}

type BlockId = 'warning' | 'image' | 'hr'

/** «Blok» menyusi — statik ma’lumot; amal click handler'da bajariladi (render paytida ref'ga tegilmaydi) */
const BLOCK_ITEMS: { id: BlockId; label: string; dot: string }[] = [
  { id: 'warning', label: 'Ogohlantirish bloki', dot: 'bg-coral' },
  { id: 'image', label: 'Rasm', dot: 'bg-field' },
  { id: 'hr', label: 'Ajratgich', dot: 'bg-field' },
]

const tb = 'am-ghost flex size-8 cursor-pointer items-center justify-center rounded-control border-0 bg-transparent text-ink'

/** H2/H3/qalin/kursiv/ro‘yxat/havola/iqtibos + «Blok» menyusi (Ogohlantirish bloki, rasm, ajratgich) */
export function MarkdownToolbar({ textareaRef, value, onChange, onInsertImage }: Props) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const onDoc = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus())
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const apply = (fn: (v: string, s: { start: number; end: number }) => EditResult) => {
    const ta = textareaRef.current
    if (!ta) return
    const r = fn(value, { start: ta.selectionStart, end: ta.selectionEnd })
    onChange(r.value)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(r.selection.start, r.selection.end)
    })
  }

  const runBlock = (id: BlockId) => {
    if (id === 'image') return onInsertImage?.()
    if (id === 'warning') return apply((v, s) => insertBlock(v, s, WARNING_BLOCK, ':::warning '.length, 'Sarlavha'.length))
    apply((v, s) => insertBlock(v, s, '---'))
  }

  const sep = <span aria-hidden className="mx-1.5 h-5 w-px bg-line" />
  return (
    <div role="toolbar" aria-label="Matn muharriri asboblari" className="sticky top-0 z-10 flex h-10 items-center gap-0.5 border-y border-line bg-white px-3">
      <button type="button" aria-label="Sarlavha H2" className={`${tb} text-[13px] font-semibold`} onClick={() => apply((v, s) => prefixLines(v, s, '## '))}>
        H2
      </button>
      <button type="button" aria-label="Sarlavha H3" className={`${tb} text-[13px] font-semibold`} onClick={() => apply((v, s) => prefixLines(v, s, '### '))}>
        H3
      </button>
      {sep}
      <button type="button" aria-label="Qalin" className={`${tb} text-[15px] font-bold`} onClick={() => apply((v, s) => wrap(v, s, '**'))}>
        B
      </button>
      <button type="button" aria-label="Kursiv" className={`${tb} text-[15px] font-medium italic`} onClick={() => apply((v, s) => wrap(v, s, '_'))}>
        I
      </button>
      {sep}
      <button type="button" aria-label="Ro‘yxat" className={tb} onClick={() => apply((v, s) => prefixLines(v, s, '- '))}>
        <Icon name="list" strokeWidth={1.8} />
      </button>
      <button type="button" aria-label="Raqamli ro‘yxat" className={tb} onClick={() => apply((v, s) => prefixLines(v, s, (i) => `${i + 1}. `))}>
        <Icon name="olist" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        aria-label="Havola"
        className={tb}
        onClick={() =>
          apply((v, s) => {
            const r = wrap(v, s, '[', '](https://)', 'havola matni')
            const urlStart = r.selection.end + 2
            return { value: r.value, selection: { start: urlStart, end: urlStart + 8 } }
          })
        }
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1M11.5 8.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" />
        </svg>
      </button>
      <button type="button" aria-label="Iqtibos" className={tb} onClick={() => apply((v, s) => prefixLines(v, s, '> '))}>
        <Icon name="quote" strokeWidth={1.5} />
      </button>
      {sep}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={() => setMenu((m) => !m)}
          className="am-btn-o flex h-8 cursor-pointer items-center gap-1.5 rounded-control border border-line-strong bg-white px-3 text-[13px] font-medium text-ink"
        >
          <PlusIcon size={12} />
          Blok
        </button>
        {menu && (
          <div role="menu" aria-label="Blok qo‘shish" className="absolute top-[38px] left-0 w-[212px] rounded-control border border-line bg-white p-1 shadow-[var(--am-shadow)]">
            {BLOCK_ITEMS.map((it) => (
              <button
                key={it.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false)
                  runBlock(it.id)
                }}
                className="am-ghost flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[4px] border-0 bg-transparent px-2.5 text-left text-sm text-ink"
              >
                <span aria-hidden className={`size-1.5 rounded-full ${it.dot}`} />
                {it.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
