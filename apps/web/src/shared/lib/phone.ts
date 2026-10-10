/**
 * O‘zbekiston raqamini yagona ko‘rinishga keltiradi: +998XXXXXXXXX.
 * Qabul qilinadi: "90 123 45 67", "+998 (90) 123-45-67", "998901234567", "8 90 123 45 67".
 * Noto‘g‘ri bo‘lsa null qaytaradi.
 */
export function normalizeUzPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('998')) digits = digits.slice(3)
  else if (digits.length === 10 && digits.startsWith('8')) digits = digits.slice(1)
  if (digits.length !== 9) return null
  return `+998${digits}`
}

/** +998901234567 → +998 90 123 45 67 */
export function formatUzPhone(e164: string): string {
  const d = e164.replace(/\D/g, '').replace(/^998/, '')
  if (d.length !== 9) return e164
  return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`
}

/** Kiritish paytida ko‘rinish: "901234567" → "90 123 45 67" */
export function maskLocalPart(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 9)
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean)
  return parts.join(' ')
}
