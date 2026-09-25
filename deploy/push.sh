#!/usr/bin/env bash
# Run on YOUR MAC. Sends the code to the server and (re)builds + restarts it.
#   deploy/push.sh root@203.0.113.10
# Safe to run for every update: secrets (.env files), photos and the database on the server are
# never touched — only code is copied.
set -euo pipefail
SERVER=${1:?"usage: deploy/push.sh root@<server-ip>"}
cd "$(dirname "$0")/.."
echo "Copying code to $SERVER:/opt/era …"
ssh "$SERVER" 'mkdir -p /opt/era'
rsync -az --delete \
  --exclude node_modules --exclude .git --exclude .turbo --exclude '**/dist' \
  --exclude .env --exclude 'apps/api/uploads' --exclude 'deploy/data' --exclude 'deploy/backups' \
  ./ "$SERVER:/opt/era/"
echo "Building and restarting on the server (first time takes several minutes)…"
ssh "$SERVER" 'cd /opt/era && docker compose -f deploy/docker-compose.yml up -d --build && docker compose -f deploy/docker-compose.yml ps'
