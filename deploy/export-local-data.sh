#!/usr/bin/env bash
# Run on YOUR MAC. Copies this machine's database + photos into deploy/data/ so they can be moved
# to the server (deploy/README.md, step 5). Read-only for your local system.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p deploy/data
echo "Exporting the database from era-postgres…"
docker exec era-postgres pg_dump -U era -d era -Fc > deploy/data/era.dump
echo "Packing photos (apps/api/uploads)…"
# --no-xattrs / COPYFILE_DISABLE: skip macOS-only file labels (Linux tar warns about them)
COPYFILE_DISABLE=1 tar --no-xattrs -czf deploy/data/uploads.tgz -C apps/api uploads
ls -lh deploy/data
echo "Done. Next: scp -r deploy/data root@<server-ip>:/opt/era/deploy/"
