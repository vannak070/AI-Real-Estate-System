#!/usr/bin/env bash
# Run ON THE SERVER, once, after the first deploy/push.sh. Replaces the server's (empty) database
# and photos with the copy in deploy/data/ (made by deploy/export-local-data.sh on your Mac).
# ⚠ Anything already in the server's database is replaced.
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE=${COMPOSE:-"docker compose -f deploy/docker-compose.yml"}
test -f deploy/data/era.dump || { echo "deploy/data/era.dump not found — copy it from your Mac first."; exit 1; }
echo "Stopping the API while the database is replaced…"
$COMPOSE stop api
$COMPOSE up -d postgres
until $COMPOSE exec -T postgres pg_isready -U era -d era >/dev/null 2>&1; do sleep 1; done
echo "Restoring the database…"
$COMPOSE exec -T postgres pg_restore -U era -d era --clean --if-exists --no-owner < deploy/data/era.dump
if [ -f deploy/data/uploads.tgz ]; then
  echo "Restoring photos…"
  $COMPOSE run --rm --no-deps -T api tar xzf - -C /app/apps/api < deploy/data/uploads.tgz
fi
$COMPOSE up -d api
echo "Done. Database and photos imported; the API is starting."
