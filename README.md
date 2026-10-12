# NeyroHelp

Nevrologiya klinikasi sayti: public sayt (uz/ru/en, SEO), blog, admin panel, Telegram guruhga tushadigan arizalar.

| Qism | Texnologiya | Papka |
| --- | --- | --- |
| Frontend | Next.js 16 (RSC, ISR), React 19, Tailwind v4, FSD, TanStack Query, Zustand | `apps/web` |
| Backend | FastAPI, SQLAlchemy 2 (async), PostgreSQL 16, Redis 7, arq | `apps/api` |
| Deploy | Docker Compose + Caddy (Farm Bot serverida) | `deploy` |

Batafsil: [ARCHITECTURE.md](ARCHITECTURE.md) · Admin API: [CONTRACT-ADMIN.md](CONTRACT-ADMIN.md) · Frontend qoidalari: [apps/web/FSD.md](apps/web/FSD.md)

## Lokal ishga tushirish

Talab: Node 22, Python 3.13 + [uv](https://docs.astral.sh/uv/), PostgreSQL 16, Redis 7 (yoki `docker compose`).

```bash
# 1. Baza (Docker bilan eng oson)
docker run -d --name nm-pg -e POSTGRES_USER=neyrohelp -e POSTGRES_PASSWORD=neyrohelp -e POSTGRES_DB=neyrohelp -p 5432:5432 postgres:16-alpine
docker run -d --name nm-redis -p 6379:6379 redis:7-alpine

# 2. Backend
cd apps/api
cp .env.example .env              # SECRET_KEY, REVALIDATE_SECRET ni to‘ldiring
uv sync
uv run alembic upgrade head
SEED_ADMIN_PASSWORD='kuchli-parol-12+' uv run python -m app.seed
uv run uvicorn app.main:app --port 8100 --reload
uv run arq app.worker.WorkerSettings   # alohida terminalda (Telegram, rejalashtirilgan maqolalar)

# 3. Frontend
cd apps/web
cp .env.example .env.local        # REVALIDATE_SECRET backend bilan bir xil
npm install
npm run dev                        # http://localhost:3000 · admin: /admin
```

Kirish: email + kuchli parol (kamida 12 belgi; kichik/katta harf, raqam, belgidan kamida 3 turi).
Ikki bosqichli kirish (Telegram kodi / Authenticator) kodda tayyor, lekin hozircha o'chiq: yoqish uchun `TWOFA_ENABLED=true`
va `TWOFA_BOT_TOKEN` (masalan Farm Bot tokeni).

Xodimlar (faqat administrator): Xodimlar → «Xodim qo'shish» (rol, login, parol — «Yaratish» kuchli parol beradi),
«Parol berish» (unutgan xodimga yangi parol), bloklash, sessiyalarni yopish.
Jurnal (faqat administrator): kim, qachon, nima qildi — xodim, amal turi va sana bo'yicha filtr.
Call-operator arizalarni oladi va statusini o'zgartiradi; har biri jurnalga yoziladi.

Favqulodda (telefon/Telegram yo'q): `uv run python -m app.reset_2fa admin@neyrohelp.uz` — 2FA o'chadi, keyingi kirishda qayta sozlanadi.

## Buyruqlar

| | Backend (`apps/api`) | Frontend (`apps/web`) |
| --- | --- | --- |
| Test | `uv run pytest -q` | `npm run typecheck && npm run lint` |
| Xavfsizlik | `uv run bandit -r app`, `uv run pip-audit` | `npm audit --omit=dev` |
| Migratsiya | `uv run alembic revision --autogenerate -m nom` → `uv run alembic upgrade head` | — |
| API tiplari | — | `npm run api:types` (API ishlab turganda) |
| Build | — | `npm run build` (API ishlab turganda — statik sahifalar shu paytda yig‘iladi) |

## Production (VPS, Docker)

Hammasi Docker'da: postgres, redis, api, worker, web (Next.js) va Caddy (HTTPS, avtomatik sertifikat).
Tashqariga faqat 80/443 ochiq; qolgan portlar 127.0.0.1 da.

Mac'dan bitta buyruq — kodni yuboradi, serverni sozlaydi (Docker, firewall, fail2ban, swap), sirlarni yaratadi,
migratsiya + seed qiladi va saytni ishga tushiradi. Qayta ishga tushirish = yangilash:

```bash
./deploy/push.sh root@95.169.201.141                 # domen yo'q: https://95-169-201-141.sslip.io
./deploy/push.sh root@95.169.201.141 neyrohelp.uz    # domen ulanganda (A yozuvi → server IP)
```

- Birinchi marta root parolini so'raydi va SSH kalitni qo'shadi; keyin server **faqat kalit bilan** kiriladi (parol o'chadi).
- Admin login/parol birinchi o'rnatishda chiqadi va serverda saqlanadi: `/root/neyrohelp-admin.txt`.
- Sirlar serverda: `/opt/neyrohelp/deploy/.env`, `deploy/api.env` (git'da yo'q, push ularni o'chirmaydi).
- Telegram arizalar boti: `deploy/api.env` ga `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` →
  `docker compose up -d api worker` → webhook:
  `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<SITE_HOST>/api/v1/telegram/webhook&secret_token=<SECRET>`
- Zaxira: har kuni 03:30 `deploy/backup.sh` (14 kun), `deploy/backups/`.
- Loglar: `cd /opt/neyrohelp/deploy && docker compose logs -f api web worker`.

Xotira limitlari: web 384M · api 320M · worker 160M · postgres 512M · redis 96M · caddy 128M.
