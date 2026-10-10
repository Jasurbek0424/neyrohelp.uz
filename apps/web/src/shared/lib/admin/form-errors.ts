/**
 * Backend xatolarini forma maydonlariga moslash.
 * 422: {"detail":"validation_error","errors":[{"loc":["body","seo","title","uz"],"type":"string_too_long"}]}
 * → { "seo.title.uz": "Juda uzun" }
 */
type ApiLikeError = { status: number; detail: string; errors?: { loc: (string | number)[]; type: string }[] }

const typeMessages: Record<string, string> = {
  missing: 'Majburiy maydon',
  string_too_short: 'Juda qisqa',
  string_too_long: 'Juda uzun',
  string_pattern_mismatch: 'Noto‘g‘ri format',
  value_error: 'Noto‘g‘ri qiymat',
  greater_than_equal: 'Qiymat juda kichik',
  less_than_equal: 'Qiymat juda katta',
  int_parsing: 'Butun son kiriting',
  int_type: 'Butun son kiriting',
  float_parsing: 'Son kiriting',
  literal_error: 'Ro‘yxatdan tanlang',
  enum: 'Ro‘yxatdan tanlang',
  uuid_parsing: 'Fayl noto‘g‘ri',
  too_long: 'Juda ko‘p element',
  too_short: 'Juda kam element',
  extra_forbidden: 'Ortiqcha maydon',
  null_not_allowed: 'Bo‘sh bo‘lishi mumkin emas',
  slug_taken: 'Bu slug band',
  in_future_required: 'Sana kelajakda bo‘lishi kerak',
  published_at_required: 'Nashr sanasini kiriting',
  password_too_short: 'Kamida 12 belgi',
  password_same_as_email: 'Parol email bilan bir xil bo‘lmasin',
  password_too_common: 'Juda oddiy parol — boshqasini tanlang',
  timezone_aware: 'Sana vaqt mintaqasi bilan bo‘lishi kerak',
}

export function fieldErrorsFrom(err: unknown): Record<string, string> {
  const e = err as ApiLikeError
  const out: Record<string, string> = {}
  if (!e || typeof e !== 'object' || !Array.isArray(e.errors)) return out
  for (const item of e.errors) {
    const path = item.loc.filter((p, i) => !(i === 0 && (p === 'body' || p === 'query'))).join('.')
    out[path || '_'] ??= typeMessages[item.type] ?? 'Noto‘g‘ri qiymat'
  }
  return out
}

const detailMessages: Record<string, string> = {
  invalid_credentials: 'Email yoki parol noto‘g‘ri.',
  invalid_totp: 'Kod noto‘g‘ri yoki eskirgan.',
  invalid_code: 'Kod noto‘g‘ri yoki eskirgan. Ilovadagi yangi kodni kiriting.',
  totp_required: 'Davom etish uchun avval ikki bosqichli himoyani (2FA) yoqing.',
  cannot_modify_self: 'O‘z hisobingizning rolini yoki holatini o‘zgartira olmaysiz.',
  password_too_short: 'Yangi parol kamida 12 belgidan iborat bo‘lishi kerak.',
  password_same_as_email: 'Parol email manzili bilan bir xil bo‘lmasligi kerak.',
  password_too_common: 'Bu parol juda keng tarqalgan. Uzunroq va noyob ibora tanlang.',
  locked: 'Hisob vaqtincha bloklangan. 15 daqiqadan keyin urinib ko‘ring.',
  rate_limited: 'Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.',
  too_many_requests: 'Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.',
  csrf_failed: 'Sessiya xavfsizlik tekshiruvidan o‘tmadi. Sahifani yangilang.',
  not_authenticated: 'Sessiya tugagan. Qayta kiring.',
  forbidden: 'Bu amal uchun ruxsatingiz yo‘q.',
  not_found: 'Topilmadi — o‘chirilgan bo‘lishi mumkin.',
  already_taken: 'Bu arizani boshqa xodim allaqachon olgan.',
  slug_taken: 'Bu URL slug band. Boshqasini kiriting.',
  in_use: 'Fayl hali ishlatilmoqda — avval bog‘langan joydan olib tashlang.',
  wrong_password: 'Joriy parol noto‘g‘ri.',
  invalid_password: 'Joriy parol noto‘g‘ri.',
  password_breached: 'Bu parol sizib chiqqanlar ro‘yxatida. Boshqa parol tanlang.',
  validation_error: 'Ba’zi maydonlar noto‘g‘ri to‘ldirilgan.',
  unsupported_media_type: 'Faqat JPEG, PNG, WebP yoki PDF fayl yuklash mumkin.',
  file_too_large: 'Fayl juda katta (ko‘pi bilan 10 MB).',
}

export function errorMessage(err: unknown, fallback = 'Xatolik yuz berdi. Qayta urinib ko‘ring.'): string {
  const e = err as ApiLikeError
  if (e && typeof e === 'object' && typeof e.detail === 'string') {
    if (detailMessages[e.detail]) return detailMessages[e.detail]!
    if (e.status === 423) return detailMessages.locked!
    if (e.status === 429) return detailMessages.rate_limited!
    if (e.status === 403) return detailMessages.forbidden!
    if (e.status >= 500) return 'Serverda xatolik. Birozdan keyin qayta urinib ko‘ring.'
  }
  if (err instanceof TypeError) return 'Tarmoq bilan aloqa yo‘q.'
  return fallback
}

/** zod xatolarini {path: message} ko‘rinishiga */
export function zodErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const i of issues) out[i.path.map(String).join('.')] ??= i.message
  return out
}
