/** 250000 → "250 000" */
export function groupDigits(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return ''
  return String(n).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** "250 000" → 250000; "" → null */
export function parseDigits(s: string, max = 9): number | null {
  const d = s.replace(/\D/g, '').slice(0, max)
  return d ? Number(d) : null
}

/** "Malika Aliyeva" → "MA" */
export function initials(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/** "Malika Aliyeva" → "Malika A." */
export function shortName(name: string | null | undefined): string {
  if (!name) return ''
  const [first, last] = name.split(/\s+/)
  return last ? `${first} ${last[0]}.` : (first ?? '')
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
