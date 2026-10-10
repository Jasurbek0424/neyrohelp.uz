# Admin API kontrakti — `/api/v1/admin`

Backend (FastAPI) va frontend (admin SPA) shu hujjat bo‘yicha yoziladi. `LText = {"uz": str, "ru"?: str, "en"?: str}`.

## Umumiy qoidalar
- Auth: `nm_access` (HttpOnly, 15 daq), `nm_refresh` (HttpOnly, 7 kun, path `/api/v1/admin/auth`), `nm_csrf` (o‘qiladigan). Hammasi `SameSite=Strict`, prod'da `Secure`.
- Har POST/PATCH/PUT/DELETE (login va refresh'dan tashqari) `X-CSRF-Token: <nm_csrf cookie qiymati>` headerini talab qiladi → yo‘q bo‘lsa 403 `csrf_failed`.
- 401 `not_authenticated` → frontend bir marta `POST /auth/refresh` qiladi, keyin so‘rovni takrorlaydi; yana 401 bo‘lsa login sahifasiga.
- Xatolar: `{"detail": "<kod>"}`; validatsiya 422 `{"detail":"validation_error","errors":[{"loc":[...],"type":"..."}]}`.
- Ro‘yxatlar: `{"items": [...], "total": n, "page": p, "pages": n}`.
- Rollar: `admin` hammasi · `editor` kontent/blog/media/sozlamalar (arizalar yo‘q) · `operator` faqat arizalar + dashboard.
- Har yozuvdan keyin backend tegishli kesh teglarini tozalaydi (`purge`).

## Auth — `/auth`
| Metod | Yo‘l | Kirish | Javob |
| --- | --- | --- | --- |
| POST | /auth/login | `{email, password, totp?: "123456"}` | 200 `{user: Me}` + cookie'lar · 2FA kerak bo‘lsa 200 `{requires_totp: true}` (cookie yo‘q) · 401 `invalid_credentials` · 423 `locked` · 429 |
| POST | /auth/refresh | — (cookie) | 200 `{user: Me}` (rotatsiya) · 401 |
| POST | /auth/logout | — | 204, cookie'lar o‘chiriladi, refresh oilasi bekor |
| GET | /auth/me | — | `Me` |
| POST | /auth/totp/setup | — | `{secret, otpauth_uri}` |
| POST | /auth/totp/enable | `{code}` | `Me` |
| POST | /auth/password | `{current, new}` (new ≥ 12 belgi) | 204; barcha sessiyalar bekor (token_version++) |

`Me = {id, email, name, role: "admin"|"editor"|"operator", totp_enabled: bool}`

## Dashboard — GET `/dashboard` (barcha rollar)
```
{
  today: {leads: int, yesterday: int},
  waiting: {count: int, oldest_minutes: int | null},
  avg_response_minutes_7d: int | null,          // created → taken
  booked_14d: {booked: int, total: int},
  chart: [{date: "2026-10-08", total: int, booked: int}],   // 14 kun, eski → yangi
  waiting_list: [LeadRow],                      // status=new, eng eskisi birinchi, 5 ta
  telegram: {enabled: bool, last_sent_at: datetime | null, failed: int},
  content_todo: {doctors_without_photo: int, services_without_price: int, posts_missing_ru: int, documents_without_file: int},  // operator uchun null
  recent_posts: [{id, title: str(uz), status, published_at}]   // 3 ta; operator uchun []
}
```

## Arizalar — `/leads` (admin, operator)
`LeadRow = {id, full_name, phone (+998…), message, status, taken_by, taken_at, tg_delivery: "pending"|"sent"|"failed"|"disabled", page, locale, created_at}`
`status ∈ new | in_progress | booked | no_answer | declined | callback | spam`
`LeadDetail = LeadRow + {admin_note, consent, events: [{kind, actor, meta, created_at}]}`  (kind: created | telegram_sent | telegram_failed | taken | status | note | duplicate)

| Metod | Yo‘l | Izoh |
| --- | --- | --- |
| GET | /leads?status&q&date_from&date_to&taken_by&page&limit(≤100) | `{items: LeadRow[], total, page, pages, counts: {all, new, in_progress, booked, no_answer, declined, callback, spam}}` (counts filtr status'ini hisobga olmaydi, boshqa filtrlarni oladi). `q` ism yoki telefon raqamlari bo‘yicha |
| GET | /leads/{id} | `LeadDetail` |
| POST | /leads/{id}/take | status new → in_progress, taken_by = user.name · 409 `already_taken` |
| PATCH | /leads/{id} | `{status?, admin_note?}` → `LeadDetail`; Telegram xabari sinxronlanadi; event yoziladi |
| GET | /leads/export?status&date_from&date_to | faqat admin; `.xlsx`; audit log |

## Kontent (admin, editor)
**Mutaxassisliklar** `/specialties`: GET → `[{id, slug, title: LText, order}]`; POST/PATCH/DELETE.

**Shifokorlar** `/doctors`
- GET → `[{id, slug, full_name, specialty_id, specialty_title (uz), audience, photo: Media|null, experience_years, order, show_on_home, is_published, completeness: {uz,ru,en}}]`
- GET /{id} → `DoctorAdmin = {id, slug, full_name, specialty_id, audience, photo: Media|null, lead: LText, experience_years, qualification: LText, price, languages: LText, work_days: string[], education: [{years, place: LText, detail: LText}], career: [...], certificates: [{title: LText, year, image: Media|null}], seo: {title: LText, description: LText}, order, show_on_home, is_published, completeness, updated_at}`
- POST / PATCH /{id}: `DoctorAdmin` maydonlari (photo o‘rniga `photo_id`, certificates[].image o‘rniga `image_id`) → `DoctorAdmin`; DELETE /{id} → 204. Slug: `^[a-z0-9-]{2,100}$`, unique → 409 `slug_taken`.

**Xizmatlar**
- GET /services → `[{id, slug, title: LText, summary: LText, description: LText, order, show_on_home, services: [{id, category_id, title: LText, note: LText, duration_minutes, price, price_from, order, is_active, completeness}]}]`
- POST /services, PATCH /services/{id}, DELETE /services/{id}
- PATCH /services/bulk `{items: [{id, price?: int|null, duration_minutes?: int|null, price_from?: bool}]}` (≤200) → yuqoridagi to‘liq ro‘yxat; narx o‘zgarishlari audit logga
- POST/PATCH/DELETE /service-categories

**Maqolalar** `/posts`
- GET ?status&category_id&q&page&limit → page of `{id, slug, title: LText, status, published_at, category_id, featured, completeness, updated_at}`
- GET /{id} → `PostAdmin = {id, slug, title, excerpt, body (LText, Markdown), seo: {title: LText, description: LText}, cover: Media|null, category_id, author_id, status: draft|scheduled|published, published_at, reading_minutes, featured, completeness, updated_at}`
- POST / PATCH /{id} (`cover_id`) → `PostAdmin`; `reading_minutes` backend hisoblaydi (uz matn so‘zlari / 180); `scheduled` uchun `published_at` kelajakda bo‘lishi shart; DELETE → 204
- Post kategoriyalari: GET/POST/PATCH/DELETE /post-categories

**Media** `/media`
- POST (multipart: `file`, `alt_uz?`) → `Media = {id, kind: image|document, url, srcset: {"480": url, "960": url, "1600": url}, width, height, alt: LText, focal_x, focal_y, size, mime}`; faqat JPEG/PNG/WebP (≤10 MB, ≤40 MP) va PDF (document)
- GET ?page&kind → page of Media; PATCH /{id} `{alt?, focal_x?, focal_y?}`; DELETE /{id} (ishlatilayotgan bo‘lsa 409 `in_use`)

**Sozlamalar** `/settings/{key}` — key ∈ site | home | clinic
- GET → saqlangan qiymat (LText maydonlari bilan, rasmlar `*_id` + yechilgan `Media`)
- PUT → to‘liq qiymat (Pydantic sxema bilan qat’iy tekshiriladi) → saqlangan qiymat

## Tizim (faqat admin)
- `/users`: GET, POST `{email, name, role, password}`, PATCH /{id} `{name?, role?, is_active?}`, POST /{id}/revoke-sessions
- `/audit?page&action` → page of `{id, user_name, action, entity, entity_id, meta, ip, created_at}`
