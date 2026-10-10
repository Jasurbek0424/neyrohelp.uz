import type { SettingsKey } from '@/entities/admin-settings'

/**
 * Sozlamalar sxemasi (backend: app/schemas/admin.py SiteSettings/HomeSettings/ClinicSettings).
 * Forma shu tavsif bo‘yicha chiziladi va PUT tanasi FAQAT shu kalitlardan yig‘iladi
 * (GET'dagi yechilgan Media obyektlari yuborilmaydi — backend extra="forbid").
 */
export type FieldDef =
  | { kind: 'text'; key: string; label: string; hint?: string; placeholder?: string; nullable?: boolean; pattern?: RegExp; patternMsg?: string; required?: boolean; max?: number; type?: string }
  | { kind: 'number'; key: string; label: string; hint?: string; step?: string; min?: number; max?: number }
  | { kind: 'lt'; key: string; label: string; hint?: string; multiline?: boolean; max?: number }
  | { kind: 'media'; key: string; label: string; accept: 'image' | 'document'; hint?: string }
  | { kind: 'select'; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: 'list'; key: string; label: string; item: string; max: number; fields: FieldDef[]; hint?: string }
  | { kind: 'ltlist'; key: string; label: string; item: string; max: number }

export type Group = { title: string; fields: FieldDef[] }

const httpsUrl = /^https:\/\/[^\s<>"']+$/

export const settingsSchema: Record<SettingsKey, Group[]> = {
  site: [
    {
      title: 'Aloqa',
      fields: [
        { kind: 'text', key: 'phone', label: 'Telefon (E.164)', placeholder: '+998901234567', required: true, pattern: /^\+998\d{9}$/, patternMsg: 'Format: +998XXXXXXXXX', type: 'tel' },
        { kind: 'text', key: 'phone_display', label: 'Telefon (ko‘rinishi)', placeholder: '+998 90 123 45 67', max: 32 },
        { kind: 'text', key: 'telegram', label: 'Telegram', placeholder: '@neyromed', nullable: true, pattern: /^@?[A-Za-z0-9_]{3,32}$/, patternMsg: '3–32 belgi: lotin harf, raqam, _' },
        { kind: 'text', key: 'email', label: 'Email', placeholder: 'info@neyromed.uz', nullable: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMsg: 'Email manzili noto‘g‘ri', type: 'email' },
        { kind: 'lt', key: 'response_time', label: 'Javob vaqti', hint: 'Masalan: «15 daqiqa ichida qo‘ng‘iroq qilamiz»' },
      ],
    },
    {
      title: 'Manzil va xarita',
      fields: [
        { kind: 'lt', key: 'address', label: 'Manzil' },
        { kind: 'lt', key: 'landmark', label: 'Mo‘ljal' },
        { kind: 'number', key: 'lat', label: 'Kenglik (lat)', step: 'any', min: -90, max: 90 },
        { kind: 'number', key: 'lng', label: 'Uzunlik (lng)', step: 'any', min: -180, max: 180 },
        { kind: 'text', key: 'yandex_map_url', label: 'Yandex xarita havolasi', nullable: true, pattern: httpsUrl, patternMsg: 'https:// bilan boshlanishi kerak', max: 500 },
        { kind: 'text', key: 'google_map_url', label: 'Google xarita havolasi', nullable: true, pattern: httpsUrl, patternMsg: 'https:// bilan boshlanishi kerak', max: 500 },
        {
          kind: 'list',
          key: 'directions',
          label: 'Qanday borish mumkin',
          item: 'Yo‘l',
          max: 10,
          fields: [
            { kind: 'select', key: 'kind', label: 'Transport', options: [{ value: 'metro', label: 'Metro' }, { value: 'bus', label: 'Avtobus' }, { value: 'car', label: 'Avtomobil' }] },
            { kind: 'lt', key: 'text', label: 'Tavsif' },
          ],
        },
      ],
    },
    {
      title: 'Ish vaqti',
      fields: [
        { kind: 'lt', key: 'hours_short', label: 'Qisqa ko‘rinish', hint: 'Masalan: «Du–Sha, 8:00–18:00»' },
        { kind: 'list', key: 'hours', label: 'Jadval', item: 'Qator', max: 14, fields: [{ kind: 'lt', key: 'days', label: 'Kunlar' }, { kind: 'lt', key: 'time', label: 'Vaqt' }] },
      ],
    },
    {
      title: 'Raqamlar va litsenziya',
      fields: [
        { kind: 'list', key: 'stats', label: 'Ko‘rsatkichlar', item: 'Ko‘rsatkich', max: 8, fields: [{ kind: 'lt', key: 'value', label: 'Qiymat' }, { kind: 'lt', key: 'label', label: 'Izoh' }] },
        { kind: 'text', key: 'license_number', label: 'Litsenziya raqami', nullable: true, max: 64 },
      ],
    },
  ],
  home: [
    {
      title: 'Birinchi ekran',
      fields: [
        { kind: 'lt', key: 'hero_eyebrow', label: 'Ustki yozuv' },
        { kind: 'lt', key: 'hero_title', label: 'Sarlavha', multiline: true },
        { kind: 'lt', key: 'hero_lead', label: 'Kirish matni', multiline: true },
        { kind: 'list', key: 'hero_images', label: 'Rasmlar', item: 'Rasm', max: 6, fields: [{ kind: 'media', key: 'image_id', label: 'Rasm', accept: 'image' }, { kind: 'lt', key: 'label', label: 'Izoh' }] },
      ],
    },
    {
      title: 'Klinika haqida bloki',
      fields: [
        { kind: 'lt', key: 'clinic_title', label: 'Sarlavha' },
        { kind: 'lt', key: 'clinic_text', label: 'Matn', multiline: true },
        { kind: 'ltlist', key: 'clinic_points', label: 'Afzalliklar', item: 'Band', max: 12 },
        { kind: 'media', key: 'clinic_image_id', label: 'Rasm', accept: 'image' },
      ],
    },
    {
      title: 'Ko‘p beriladigan savollar',
      fields: [{ kind: 'list', key: 'faq', label: 'Savollar', item: 'Savol', max: 30, fields: [{ kind: 'lt', key: 'question', label: 'Savol' }, { kind: 'lt', key: 'answer', label: 'Javob', multiline: true }] }],
    },
  ],
  clinic: [
    {
      title: 'Sahifa boshi',
      fields: [
        { kind: 'lt', key: 'title', label: 'Sarlavha' },
        { kind: 'lt', key: 'lead', label: 'Kirish matni', multiline: true },
        { kind: 'media', key: 'cover_id', label: 'Muqova', accept: 'image' },
        { kind: 'lt', key: 'cover_caption', label: 'Muqova izohi' },
      ],
    },
    {
      title: 'Yondashuv',
      fields: [
        { kind: 'lt', key: 'approach_title', label: 'Bo‘lim sarlavhasi' },
        { kind: 'list', key: 'approach', label: 'Tamoyillar', item: 'Tamoyil', max: 12, fields: [{ kind: 'lt', key: 'title', label: 'Sarlavha' }, { kind: 'lt', key: 'text', label: 'Matn', multiline: true }] },
      ],
    },
    {
      title: 'Uskunalar',
      fields: [
        {
          kind: 'list',
          key: 'equipment',
          label: 'Uskunalar',
          item: 'Uskuna',
          max: 50,
          fields: [{ kind: 'lt', key: 'name', label: 'Nomi' }, { kind: 'lt', key: 'purpose', label: 'Vazifasi' }, { kind: 'media', key: 'image_id', label: 'Rasm', accept: 'image' }],
        },
      ],
    },
    {
      title: 'Hujjatlar',
      fields: [
        {
          kind: 'list',
          key: 'documents',
          label: 'Litsenziya va sertifikatlar',
          item: 'Hujjat',
          max: 50,
          hint: 'PDF yoki rasm. Fayl yuklanmagan hujjat saytda «tez orada» deb ko‘rsatiladi.',
          fields: [{ kind: 'lt', key: 'title', label: 'Nomi' }, { kind: 'text', key: 'number', label: 'Raqami', max: 64 }, { kind: 'media', key: 'file_id', label: 'Fayl', accept: 'document' }],
        },
      ],
    },
  ],
}

/** `clinic_image_id` → GET javobidagi yechilgan Media kaliti `clinic_image` */
export const mediaKeyOf = (idKey: string) => idKey.replace(/_id$/, '')
