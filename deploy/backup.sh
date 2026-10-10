#!/usr/bin/env bash
# Kunlik zaxira (cron: 30 3 * * *). Postgres dump + media. 14 kun saqlanadi.
set -euo pipefail
cd "$(dirname "$0")"
STAMP=$(date +%F)
mkdir -p backups
docker compose exec -T postgres pg_dump -U neyromed -Fc neyromed > "backups/db-$STAMP.dump"
docker run --rm -v neyromed_media:/m -v "$PWD/backups:/b" alpine tar -czf "/b/media-$STAMP.tar.gz" -C /m .
find backups -type f -mtime +14 -delete
# Serverdan tashqariga nusxa (rclone/rsync) — sozlang
