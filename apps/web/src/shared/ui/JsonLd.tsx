/**
 * JSON-LD strukturaviy ma’lumot. `<`, `>`, `&` belgilari unicode-escape qilinadi —
 * matn ichidagi `</script>` skriptni yopib, HTML kiritishga yo‘l qo‘ymaydi.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'))
}

/** undefined/null/bo‘sh qiymatlarni olib tashlaydi (toza JSON-LD) */
function prune(value: unknown): unknown {
  if (Array.isArray(value)) {
    const arr = value.map(prune).filter((v) => v !== undefined)
    return arr.length ? arr : undefined
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([k, v]) => [k, prune(v)] as const)
      .filter(([, v]) => v !== undefined)
    return entries.length ? Object.fromEntries(entries) : undefined
  }
  if (value === null || value === '') return undefined
  return value
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(prune(data)) }} />
}
