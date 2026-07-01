#!/usr/bin/env bash
# NexusBot production deploy helper.
# Usage: ./scripts/deploy.sh [--with-docker]
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env — copy .env.example first." >&2
  exit 1
fi

if [ "${1:-}" = "--with-docker" ]; then
  docker compose pull
  docker compose build
  docker compose up -d
  exit 0
fi

npm ci --no-audit --no-fund
npm run db:generate
npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
npm run build
pm2 startOrReload ecosystem.config.js
pm2 save
