#!/usr/bin/env bash
# Run ON THE SERVER — nightly via cron (deploy/README.md, step 8). Keeps 14 days of database
# backups and 7 days of photo backups in /var/backups/era. Restore = deploy/import-data.sh with
# the chosen files copied to deploy/data/era.dump and deploy/data/uploads.tgz.
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE=${COMPOSE:-"docker compose -f deploy/docker-compose.yml"}
DIR=${BACKUP_DIR:-/var/backups/era}
STAMP=$(date +%F-%H%M)
mkdir -p "$DIR"
$COMPOSE exec -T postgres pg_dump -U era -d era -Fc > "$DIR/db-$STAMP.dump"
$COMPOSE run --rm --no-deps -T api tar czf - -C /app/apps/api uploads > "$DIR/uploads-$STAMP.tgz"
find "$DIR" -name 'db-*.dump' -mtime +14 -delete
find "$DIR" -name 'uploads-*.tgz' -mtime +7 -delete
echo "$(date '+%F %T') backup ok: $(du -h "$DIR/db-$STAMP.dump" | cut -f1) database, $(du -h "$DIR/uploads-$STAMP.tgz" | cut -f1) photos"
