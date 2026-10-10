# NeyroMed

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
docker run -d --name nm-pg -e POSTGRES_USER=neyromed -e POSTGRES_PASSWORD=neyromed -e POSTGRES_DB=neyromed -p 5432:5432 postgres:16-alpine
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

Admin birinchi kirishda 2FA (Google Authenticator va h.k.) ni sozlashni talab qiladi.

## Buyruqlar

| | Backend (`apps/api`) | Frontend (`apps/web`) |
| --- | --- | --- |
| Test | `uv run pytest -q` | `npm run typecheck && npm run lint` |
| Xavfsizlik | `uv run bandit -r app`, `uv run pip-audit` | `npm audit --omit=dev` |
| Migratsiya | `uv run alembic revision --autogenerate -m nom` → `uv run alembic upgrade head` | — |
| API tiplari | — | `npm run api:types` (API ishlab turganda) |
| Build | — | `npm run build` (API ishlab turganda — statik sahifalar shu paytda yig‘iladi) |

## Production (Farm Bot serveri, 4 GB)

```bash
cd deploy
cp .env.example .env        # parollar
cp ../apps/api/.env.example api.env   # ENV=prod, COOKIE_SECURE=true, SITE_URL, CORS_ORIGINS, Telegram
docker compose up -d postgres redis api worker
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed
docker compose build web && docker compose up -d web
# Caddy: deploy/Caddyfile → /etc/caddy/Caddyfile, sudo systemctl reload caddy
# Telegram webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://neyromed.uz/api/v1/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
# Zaxira: crontab → 30 3 * * * /path/deploy/backup.sh
```

Xotira limitlari: web 384M · api 320M · worker 160M · postgres 512M · redis 96M.
