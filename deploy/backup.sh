#!/usr/bin/env bash
# Kunlik zaxira (cron: 30 3 * * *). Postgres dump + media. 14 kun saqlanadi.
set -euo pipefail
cd "$(dirname "$0")"
STAMP=$(date +%F)
mkdir -p backups
docker compose exec -T postgres pg_dump -U neyrohelp -Fc neyrohelp > "backups/db-$STAMP.dump"
tar -czf "backups/media-$STAMP.tar.gz" -C "${MEDIA_PATH:-/srv/neyrohelp/media}" .
find backups -type f -mtime +14 -delete
# Serverdan tashqariga nusxa (rclone/rsync) — sozlang
