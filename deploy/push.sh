#!/usr/bin/env bash
# Run on YOUR MAC. Sends the code to the server and restarts it with the new version.
#   deploy/push.sh root@<server-ip>                 build on the server (needs ≥ 2 GB RAM)
#   deploy/push.sh root@<server-ip> --build-on-mac  build here, send the finished images
#                                                   (for 1 GB servers; the Mac needs Docker Desktop)
# Safe to run for every update: secrets (.env files), photos and the database on the server are
# never touched — only code/images are sent.
set -euo pipefail
SERVER=${1:?"usage: deploy/push.sh root@<server-ip> [--build-on-mac]"}
MODE=${2:-}
cd "$(dirname "$0")/.."
COMPOSE='docker compose -f deploy/docker-compose.yml'

echo "Copying code to $SERVER:/opt/era …"
ssh "$SERVER" 'mkdir -p /opt/era'
rsync -az --delete \
  --exclude node_modules --exclude .git --exclude .turbo --exclude '**/dist' \
  --exclude .env --exclude 'apps/api/uploads' --exclude 'deploy/data' --exclude 'deploy/backups' \
  ./ "$SERVER:/opt/era/"

if [ "$MODE" = "--build-on-mac" ]; then
  test -f deploy/.env || { echo "deploy/.env not found — it holds CLIENT_URL for the build."; exit 1; }
  CLIENT_URL=$(grep '^CLIENT_URL=' deploy/.env | cut -d= -f2-)
  # DigitalOcean droplets are Intel/AMD (linux/amd64); a Mac with Apple silicon builds that too, just slower.
  echo "Building on this Mac for linux/amd64 (first time takes a while)…"
  # --progress=plain: streams every layer's output continuously instead of Docker's default
  # collapsing terminal UI, which can sit with no visible change for minutes during the slow
  # emulated linux/amd64 build on Apple Silicon and looks hung even when it isn't.
  docker buildx build --platform linux/amd64 --progress=plain --target api -t era-api:latest --load .
  docker buildx build --platform linux/amd64 --progress=plain --target web -t era-web:latest --build-arg "VITE_CLIENT_URL=$CLIENT_URL" --load .
  echo "Sending the images to the server…"
  docker save era-api:latest era-web:latest | gzip | ssh "$SERVER" 'gunzip | docker load'
  # --force-recreate: loaded images keep the same tag, and Compose doesn't always notice the new
  # content (seen 2026-09-25) — always restart the two app containers (the database is untouched).
  ssh "$SERVER" "cd /opt/era && $COMPOSE up -d --no-build --force-recreate api web && $COMPOSE ps && docker image prune -f >/dev/null"
else
  echo "Building and restarting on the server (first time takes several minutes)…"
  ssh "$SERVER" "cd /opt/era && $COMPOSE up -d --build && $COMPOSE ps"
fi
