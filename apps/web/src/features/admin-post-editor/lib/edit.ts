/** Textarea tanlovi ustida Markdown tahrirlari (toolbar tugmalari) */
export type Selection = { start: number; end: number }
export type EditResult = { value: string; selection: Selection }

export function wrap(value: string, sel: Selection, before: string, after = before, placeholder = 'matn'): EditResult {
  const picked = value.slice(sel.start, sel.end) || placeholder
  const next = value.slice(0, sel.start) + before + picked + after + value.slice(sel.end)
  const start = sel.start + before.length
  return { value: next, selection: { start, end: start + picked.length } }
}

/** Tanlangan qatorlar boshiga prefiks (## , - , 1. , > ) — takror bosilsa olib tashlaydi */
export function prefixLines(value: string, sel: Selection, prefix: string | ((i: number) => string)): EditResult {
  const lineStart = value.lastIndexOf('\n', sel.start - 1) + 1
  const lineEndIdx = value.indexOf('\n', sel.end)
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx
  const lines = value.slice(lineStart, lineEnd).split('\n')
  const make = (i: number) => (typeof prefix === 'function' ? prefix(i) : prefix)
  const all = lines.every((l, i) => l.startsWith(make(i)))
  const existing = /^(#{1,6} |[-*] |\d+\. |> )/
  const changed = lines.map((l, i) => (all ? l.slice(make(i).length) : make(i) + l.replace(existing, ''))).join('\n')
  const next = value.slice(0, lineStart) + changed + value.slice(lineEnd)
  return { value: next, selection: { start: lineStart, end: lineStart + changed.length } }
}

/** Blokni alohida paragraf sifatida qo‘shish */
export function insertBlock(value: string, sel: Selection, block: string, selectFrom?: number, selectLen?: number): EditResult {
  const before = value.slice(0, sel.start)
  const after = value.slice(sel.end)
  const lead = before.length === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const tail = after.startsWith('\n\n') || after.length === 0 ? '' : after.startsWith('\n') ? '\n' : '\n\n'
  const next = before + lead + block + tail + after
  const base = before.length + lead.length
  const start = base + (selectFrom ?? block.length)
  return { value: next, selection: { start, end: start + (selectLen ?? 0) } }
}
