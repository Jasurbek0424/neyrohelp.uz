# Frontend qoidalari (apps/web)

## Tuzilma
```
app/                     Next routing — FAQAT ingichka fayllar: views'dan import + generateMetadata/params
  [locale]/...           public sayt (SSR/ISR)
  admin/...              admin SPA (client)
  api/revalidate         backend → revalidateTag
src/
  app/                   providers, styles (FSD «app» qatlami)
  views/<page>/          sahifa kompozitsiyasi (FSD «pages»)       index.ts majburiy
  widgets/<block>/       katta mustaqil bloklar                    index.ts majburiy
  features/<action>/     foydalanuvchi harakati (forma, filtr)     index.ts majburiy
  entities/<entity>/     model (tiplar), api (query/fetch), ui (kartalar)   index.ts majburiy
  shared/                ui, api, lib, config, i18n — fayl bo‘yicha import (@/shared/ui/Button)
```
Segmentlar slice ichida: `ui/`, `model/`, `api/`, `lib/`, `config/`.

## Qatlamlar
`app > views > widgets > features > entities > shared` — faqat pastga import. Bir qatlamdagi slice'lar bir-birini import qilmaydi. ESLint (`npm run lint`) buzilishni ushlaydi.

## Ma’lumot
- Public sahifalar: RSC + `apiGet()` (`@/shared/api/server`) — Next Data Cache, teglar `tags.*`. TanStack Query ishlatilmaydi (JS kerak emas).
- Admin: TanStack Query — har entity'da query key factory (`doctorKeys.all/list/detail`), `staleTime` 30s, mutatsiyadan keyin aniq kalitlarni `invalidateQueries`, status o‘zgarishida optimistic update + rollback.
- Client UI state: Zustand (faqat UI: drawer, tanlangan qator, saqlanmagan o‘zgarishlar, kontent tili). Server ma’lumotini Zustand'ga ko‘chirmang. Filtrlar URL search params'da (ulashsa bo‘ladi).
- Tiplar: `@/shared/api/schema.d.ts` — `npm run api:types` (OpenAPI'dan). Qo‘lda tip yozmang, `components['schemas']['X']` dan oling.

## Xavfsizlik
- `dangerouslySetInnerHTML` faqat: JSON-LD (`JSON.stringify` + `<` escape) va markdown render (`html: false`, xavfsiz havola tekshiruvi).
- Tashqi havolalar `rel="noopener noreferrer"`. Foydalanuvchi kiritgan URL'lar faqat `https?:`/`tel:`/`mailto:`.
- Admin sahifalar `noindex`, nonce CSP (proxy.ts). Token hech qachon JS'da saqlanmaydi (HttpOnly cookie).
