#!/usr/bin/env bash
# Dumps the DevSync database to ./backups/devsync-<timestamp>.archive.gz and keeps the last 7.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
file="backups/devsync-$(date +%Y%m%d-%H%M%S).archive.gz"
docker compose -f docker-compose.prod.yml exec -T mongo mongodump --db devsync --archive --gzip > "$file"
ls -1t backups/devsync-*.archive.gz | tail -n +8 | xargs -r rm --
echo "Backup written to $file"
# Restore: docker compose -f docker-compose.prod.yml exec -T mongo mongorestore --archive --gzip --drop < "$file"
