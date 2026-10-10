import { z } from 'zod'

/** Backend `password_problem` bilan bir xil qoidalar: ≥12 belgi, 4 turdan (a-z, A-Z, 0-9, belgi) kamida 3 tasi */
export function passwordKinds(pw: string): number {
  return [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length
}

export const strongPassword = (minMsg = 'Parol kamida 12 belgi') =>
  z
    .string()
    .min(12, minMsg)
    .max(256, 'Juda uzun')
    .refine((pw) => passwordKinds(pw) >= 3, 'Kichik va katta harf, raqam, belgidan kamida 3 turini ishlating')

const SETS = ['abcdefghijkmnpqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '-_!@#%*+=?']

/** Kriptografik tasodifiy kuchli parol (o‘xshash belgilarsiz: 0/O, 1/l/I) */
export function generatePassword(length = 16): string {
  const all = SETS.join('')
  const rnd = (n: number) => {
    const a = new Uint32Array(1)
    // modulo bias'siz
    const limit = Math.floor(0x1_0000_0000 / n) * n
    do crypto.getRandomValues(a)
    while (a[0]! >= limit)
    return a[0]! % n
  }
  const chars = SETS.map((s) => s[rnd(s.length)]!)
  while (chars.length < length) chars.push(all[rnd(all.length)]!)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd(i + 1)
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }
  return chars.join('')
}
