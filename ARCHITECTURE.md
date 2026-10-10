# NeyroMed — arxitektura

## Tizim

```
Brauzer ──► Cloudflare (CDN, WAF, DDoS, TLS) ──► Caddy (VPS, HTTPS, xavfsizlik headerlari)
                                                   ├─► web  : Next.js 16 (public SSR/ISR + /admin SPA)   :3100
                                                   ├─► api  : FastAPI (gunicorn+uvicorn)                 :8100  (/api/*)
                                                   └─► /media/* : statik fayllar (immutable kesh)
api ──► PostgreSQL 16 (asosiy ma'lumot)   api ──► Redis 7 (kesh, rate-limit, arq navbat)
worker (arq) ──► Telegram Bot API (arizalar)     api ──► web /api/revalidate (tag invalidatsiya)
```

Farm Bot bilan bitta 4 GB VPS: har servisga xotira limiti (docker compose `mem_limit`):
web 384M · api 320M · worker 160M · postgres 512M (shared_buffers 128MB) · redis 96M (maxmemory 64mb, allkeys-lru).

## Nega shunday

- **Next.js (SSR/ISR)** — SEO uchun HTML serverda tayyor bo‘lishi shart. Public sahifalar RSC: brauzerga minimal JS.
- **FastAPI** — Farm Bot bilan bir xil Python stack; Pydantic validatsiya; OpenAPI → frontend tiplari avtomatik.
- **PostgreSQL** — parallel yozuvlar, JSONB (uz/ru/en matnlar), to‘liq matnli qidiruv, ishonchli zaxira.
- **Redis** — API kesh, rate-limit, fon vazifalar navbati.

## Kesh va tozalash (4 qatlam)

| Qatlam | Nima | TTL | Tozalash |
| --- | --- | --- | --- |
| Cloudflare | statik fayllar, media | 1 yil, immutable (hash nomlar) | yangi fayl = yangi URL |
| Next Data Cache / ISR | public sahifalar va API javoblari | `revalidate: 3600` | API kontent o‘zgarganda `POST /api/revalidate {tags}` → `revalidateTag` |
| Redis (API) | public GET javoblari | 10 daq | yozuvda tag bo‘yicha o‘chirish (`cache:tag:<tag>` set) |
| TanStack Query (admin) | server state | staleTime 30s, gcTime 5 daq | mutatsiyadan keyin `invalidateQueries`, logout'da `queryClient.clear()` + Zustand reset |

Teglar: `settings`, `home`, `clinic`, `services`, `doctors`, `doctor:<slug>`, `posts`, `post:<slug>`.

## Frontend — Feature-Sliced Design (`apps/web/src`)

```
app/       providerlar, global stillar, konfiguratsiya   (Next routing: apps/web/app — faqat ingichka re-eksport)
views/     sahifalar (FSD «pages» qatlami; Next `pages/` bilan to‘qnashmasligi uchun views)
widgets/   header, footer, hero, leads-table, lead-drawer ...
features/  lead-submit, locale-switch, auth-login, lead-status-change, price-inline-edit ...
entities/  doctor, service, post, lead, settings — tiplar, query'lar, kartalar
shared/    ui, api (fetch klient, generatsiya qilingan tiplar), lib, config, i18n
```
Qoida: qatlam faqat o‘zidan pastdagilarni import qiladi; slice'lar `index.ts` (public API) orqali.
Server state — TanStack Query (admin); client UI state — Zustand (drawer, filtrlar, saqlanmagan o‘zgarishlar). Public sahifalar RSC'da to‘g‘ridan-to‘g‘ri fetch qiladi (TanStack kerak emas).

## SEO

SSG/ISR · `generateMetadata` (title, description, canonical) · hreflang uz/ru/en + x-default · JSON-LD: MedicalClinic, Physician, MedicalWebPage/Article, FAQPage, BreadcrumbList, Offer (narxlar) · sitemap (til alternativlari bilan) · robots · dinamik OG rasm (`next/og`) · semantik HTML · Core Web Vitals byudjeti (LCP ≤ 2s, CLS ≤ 0.05, INP ≤ 200ms) · IndexNow ping nashrda.

## Xavfsizlik (OWASP ASVS L2 asosida)

**Autentifikatsiya**
- Parol: argon2id; minimal 12 belgi; parol qayta ishlatish taqiqi yo‘q, lekin sizib chiqqanlar ro‘yxati tekshiruvi (lokal top-10k).
- 2FA (TOTP) administrator va muharrir uchun majburiy.
- Sessiya: access JWT 15 daq + refresh 7 kun, ikkalasi `HttpOnly; Secure; SameSite=Strict` cookie. Refresh rotatsiyasi, qayta ishlatilsa butun oila bekor qilinadi (token theft aniqlash).
- Login: IP+email bo‘yicha rate-limit, 5 xatodan keyin 15 daq blok; javob matni hamma holatda bir xil (user enumeration yo‘q); vaqt bo‘yicha tenglashtirish.

**Avtorizatsiya**
- RBAC: admin / editor / operator. Har admin endpointda `require_role(...)` — default deny. Obyekt darajasida tekshiruv (IDOR yo‘q).

**So‘rovlar**
- CSRF: SameSite=Strict + har mutatsiyada `X-CSRF-Token` (double-submit) tekshiruvi.
- Validatsiya: Pydantic strict, barcha matnlarga max uzunlik, enum'lar, telefon regex. So‘rov tanasi limiti (1 MB; upload 10 MB).
- SQL: faqat SQLAlchemy parametrlari, xom SQL yo‘q.
- Rate-limit (Redis): ariza 5/10 daq/IP, login 10/15 daq/IP, admin API 600/daq/foydalanuvchi.
- CORS: faqat sayt domeni; production'da OpenAPI docs o‘chiq.

**Chiqish va brauzer**
- React avtomatik escaping; Markdown `html: false` bilan render, havolalar `rel="noopener nofollow"`, faqat http(s)/tel/mailto.
- Headerlar: CSP (nonce, `default-src 'self'`, `frame-ancestors 'none'`), HSTS preload, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`.

**Fayllar**
- Faqat JPEG/PNG/WebP (+PDF hujjatlar uchun): magic bytes tekshiruvi, Pillow bilan qayta kodlash (EXIF/GPS o‘chadi), decompression bomb limiti, tasodifiy nom, foydalanuvchi nomi hech qachon yo‘lda ishlatilmaydi. SVG taqiqlangan.

**Ma’lumotlar (shaxsiy)**
- Minimal yig‘ish (ism, telefon, shikoyat), rozilik qayd etiladi, saqlash muddati tugagach avtomatik o‘chirish.
- Loglarda telefon/ism maskalanadi. Eksport faqat admin, audit logga yoziladi.
- Postgres foydalanuvchisi minimal huquqli; Redis faqat localhost + parol; sirlar faqat `.env` (git'da yo‘q).

**Integratsiyalar**
- Telegram webhook: maxfiy header konstant vaqtda solishtiriladi, faqat ruxsat etilgan chat ID.
- Revalidate endpoint: maxfiy kalit + faqat ichki tarmoqdan.

**Audit va kuzatuv**
- Audit log: login (muvaffaqiyatli/xato), rol o‘zgarishi, eksport, o‘chirish, narx o‘zgarishi.
- CI: `pip-audit`, `npm audit`, `bandit`, `ruff`, `tsc`, testlar. Dependency yangilanishlari haftalik.
