#!/usr/bin/env bash
# Mac'dan serverga joylash: kodni yuboradi va install.sh ni ishga tushiradi.
#   ./deploy/push.sh root@95.169.201.141 [SITE_HOST]
# Birinchi marta root parolini so'raydi (SSH kalitni serverga qo'shish uchun), keyin parolsiz ishlaydi.
set -euo pipefail
HOST=${1:?"Foydalanish: ./deploy/push.sh root@SERVER_IP [SITE_HOST]"}
SITE_HOST=${2:-}
cd "$(dirname "$0")/.."

# 1. SSH kalit (yo'q bo'lsa yaratiladi) va serverga qo'shiladi
[ -f ~/.ssh/id_ed25519.pub ] || ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519 -C "$(whoami)@neyrohelp-deploy"
if ! ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$HOST" true 2>/dev/null; then
  echo "==> SSH kalit serverga qo'shilmoqda (root parolini kiriting)"
  ssh-copy-id -o StrictHostKeyChecking=accept-new -i ~/.ssh/id_ed25519.pub "$HOST"
fi

# 2. Kod (sirlar, node_modules, build natijalari, lokal media yuborilmaydi)
echo "==> Kod yuborilmoqda"
ssh "$HOST" 'mkdir -p /opt/neyrohelp && command -v rsync >/dev/null || (apt-get update -qq && apt-get install -y -qq rsync >/dev/null)'
rsync -az --delete \
  --exclude .git --exclude node_modules --exclude .next --exclude .venv --exclude __pycache__ \
  --exclude .pytest_cache --exclude .ruff_cache --exclude tsconfig.tsbuildinfo --exclude dump.rdb \
  --exclude '/apps/api/.env' --exclude '/apps/web/.env.local' --exclude '/apps/api/media' \
  --exclude '/deploy/.env' --exclude '/deploy/api.env' --exclude '/deploy/backups' \
  ./ "$HOST":/opt/neyrohelp/

# Mac'da fayllar ko'pincha 600 — konteyner foydalanuvchisi o'qiy olsin (sirlar .env/api.env va zaxiralar bundan mustasno)
ssh "$HOST" "find /opt/neyrohelp -path /opt/neyrohelp/deploy/backups -prune -o ! -name '*.env' -exec chmod go+rX {} +"

# 3. O'rnatish / yangilash
ssh -t "$HOST" "bash /opt/neyrohelp/deploy/install.sh $SITE_HOST"
