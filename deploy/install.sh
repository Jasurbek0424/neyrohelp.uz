#!/usr/bin/env bash
# NeyroHelp — serverga o'rnatish / yangilash (Ubuntu/Debian, root). Qayta ishga tushirish xavfsiz.
#   bash /opt/neyrohelp/deploy/install.sh [SITE_HOST]
# SITE_HOST berilmasa: <server-ip>.sslip.io (domen ulanmaguncha vaqtinchalik HTTPS manzil).
set -euo pipefail

APP_DIR=/opt/neyrohelp
cd "$APP_DIR/deploy"
log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

[ "$(id -u)" = 0 ] || { echo "root sifatida ishga tushiring"; exit 1; }

# ───────────── 1. Tizim paketlari, Docker, firewall ─────────────
# Ishlamaydigan uchinchi tomon apt repolari (masalan, cloudsmith caddy → 402) apt-get update ni yiqitmasin:
# o'rnatish vaqtida chetga olinadi, oxirida qaytariladi
BROKEN_LISTS=$(grep -l cloudsmith /etc/apt/sources.list.d/*.list 2>/dev/null || true)
for f in $BROKEN_LISTS; do mv "$f" "$f.neyrohelp-off"; done
trap 'for f in $BROKEN_LISTS; do [ -f "$f.neyrohelp-off" ] && mv "$f.neyrohelp-off" "$f"; done' EXIT
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  log "Docker o'rnatilmoqda"
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl >/dev/null
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null

if ! command -v ufw >/dev/null || ! command -v fail2ban-client >/dev/null || ! command -v crontab >/dev/null; then
  log "ufw, fail2ban va cron o'rnatilmoqda"
  apt-get update -qq && apt-get install -y -qq ufw fail2ban unattended-upgrades cron >/dev/null
  systemctl enable --now cron >/dev/null 2>&1 || true
fi
log "Firewall: faqat SSH, 80, 443"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null
systemctl enable --now fail2ban >/dev/null 2>&1 || true

# Parol bilan SSH ni o'chirish — faqat DISABLE_SSH_PASSWORD=1 bilan (server boshqa loyihalar bilan bo'lishilgan bo'lishi mumkin)
if [ "${DISABLE_SSH_PASSWORD:-0}" = 1 ] && [ -s /root/.ssh/authorized_keys ]; then
  mkdir -p /etc/ssh/sshd_config.d
  cat > /etc/ssh/sshd_config.d/10-neyrohelp.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
  sshd -t && (systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true)
  echo "SSH: faqat kalit bilan kirish (parol o'chirildi)"
fi

# Kichik serverda Next build uchun swap
if [ "$(swapon --show | wc -l)" = 0 ] && [ "$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)" -lt 4096 ]; then
  log "2 GB swap yaratilmoqda"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ───────────── 2. Sirlar (bir marta yaratiladi, keyin saqlanadi) ─────────────
IP=$(curl -fsS4 --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')
SITE_HOST=${1:-$(grep -s '^SITE_HOST=' .env | cut -d= -f2 || true)}
SITE_HOST=${SITE_HOST:-${IP//./-}.sslip.io}
rnd() { openssl rand -hex "$1"; }

if [ ! -f .env ]; then
  log "deploy/.env yaratilmoqda"
  umask 077
  cat > .env <<EOF
SITE_HOST=$SITE_HOST
SITE_URL=https://$SITE_HOST
POSTGRES_PASSWORD=$(rnd 24)
REDIS_PASSWORD=$(rnd 24)
REVALIDATE_SECRET=$(rnd 32)
EOF
else
  sed -i "s|^SITE_HOST=.*|SITE_HOST=$SITE_HOST|; s|^SITE_URL=.*|SITE_URL=https://$SITE_HOST|" .env
fi
REVALIDATE_SECRET=$(grep '^REVALIDATE_SECRET=' .env | cut -d= -f2)

if [ ! -f api.env ]; then
  log "deploy/api.env yaratilmoqda"
  umask 077
  cat > api.env <<EOF
ENV=prod
SECRET_KEY=$(rnd 32)
REVALIDATE_SECRET=$REVALIDATE_SECRET
SITE_URL=https://$SITE_HOST
CORS_ORIGINS=["https://$SITE_HOST"]
COOKIE_SECURE=true
TWOFA_ENABLED=false
# Arizalar boti (Farm Bot'dan ALOHIDA bot) — to'ldirilgach: docker compose up -d api worker
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_WEBHOOK_SECRET=
LEAD_RETENTION_DAYS=365
EOF
else
  sed -i "s|^SITE_URL=.*|SITE_URL=https://$SITE_HOST|; s|^CORS_ORIGINS=.*|CORS_ORIGINS=[\"https://$SITE_HOST\"]|" api.env
fi
chmod 600 .env api.env

# ───────────── 3. Baza, API, migratsiya ─────────────
# Media host papkada: API (uid 10001) yozadi, Caddy o'qiydi
MEDIA_PATH=/srv/neyrohelp/media
mkdir -p "$MEDIA_PATH" && chown 10001 "$MEDIA_PATH" && chmod 755 /srv/neyrohelp "$MEDIA_PATH"

log "API va baza ishga tushirilmoqda (birinchi marta bir necha daqiqa)"
docker compose build api
docker compose up -d postgres redis
docker compose run --rm api alembic upgrade head
docker compose up -d api

if [ ! -f /root/neyrohelp-admin.txt ]; then
  ADMIN_PW="$(openssl rand -base64 15 | tr -d '/+=')-Nh7!"
  if docker compose run --rm -e SEED_ADMIN_EMAIL=admin@neyrohelp.uz -e SEED_ADMIN_PASSWORD="$ADMIN_PW" api python -m app.seed; then
    umask 077
    printf 'Admin panel: https://%s/admin\nLogin: admin@neyrohelp.uz\nParol: %s\n' "$SITE_HOST" "$ADMIN_PW" > /root/neyrohelp-admin.txt
  fi
fi

log "API tayyor bo'lishini kutish"
for _ in $(seq 1 30); do curl -fs -o /dev/null http://127.0.0.1:8100/api/v1/public/site?locale=uz && break; sleep 2; done

# ───────────── 4. Sayt (Next.js) va Caddy (HTTPS) ─────────────
log "Sayt yig'ilmoqda (npm build — 3-6 daqiqa)"
docker build --network host -t neyrohelp-web \
  --build-arg NEXT_PUBLIC_SITE_URL="https://$SITE_HOST" --build-arg API_INTERNAL_URL=http://127.0.0.1:8100 \
  ../apps/web
docker compose up -d --no-build --force-recreate web && docker compose up -d worker

# Tizim Caddy bor bo'lsa (Farm Bot bilan bitta server) — unga sayt bloki qo'shamiz; yo'q bo'lsa docker caddy
if systemctl is-active --quiet caddy && [ -f /etc/caddy/Caddyfile ]; then
  log "Tizim Caddy'ga sayt qo'shilmoqda: $SITE_HOST"
  sed "s|{\$SITE_HOST}|$SITE_HOST|" Caddyfile.host > /etc/caddy/neyrohelp.caddy
  cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak
  grep -q '^import neyrohelp.caddy' /etc/caddy/Caddyfile || printf '\nimport neyrohelp.caddy\n' >> /etc/caddy/Caddyfile
  if caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
    systemctl reload caddy
  else
    cp /etc/caddy/Caddyfile.bak /etc/caddy/Caddyfile && rm -f /etc/caddy/neyrohelp.caddy
    echo "XATO: Caddy konfiguratsiyasi yaroqsiz — tizim Caddy o'zgartirilmadi"; exit 1
  fi
else
  docker compose --profile edge up -d caddy
fi
docker image prune -f >/dev/null

# Kunlik zaxira
chmod +x backup.sh
( { crontab -l 2>/dev/null || true; } | { grep -v 'neyrohelp/deploy/backup.sh' || true; }; echo "30 3 * * * $APP_DIR/deploy/backup.sh >> /var/log/neyrohelp-backup.log 2>&1" ) | crontab -

log "Tayyor"
docker compose ps --format 'table {{.Service}}\t{{.Status}}'
echo
echo "Sayt:        https://$SITE_HOST"
cat /root/neyrohelp-admin.txt 2>/dev/null || true
echo "(admin ma'lumotlari serverda: /root/neyrohelp-admin.txt)"
