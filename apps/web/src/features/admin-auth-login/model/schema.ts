import { z } from 'zod'

export const credentialsSchema = z.object({
  email: z.string().trim().min(1, 'Email kiriting').pipe(z.email({ message: 'Email manzili noto‘g‘ri' })),
  password: z.string().min(1, 'Parolni kiriting').max(256, 'Parol juda uzun'),
})

export const totpSchema = z.string().regex(/^\d{6}$/, '6 xonali kodni kiriting')
