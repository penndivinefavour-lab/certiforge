#!/bin/bash
# CertiForge production bootstrap
# Run from repo root after code checkout on the production server

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

cd "$ROOT"

echo "============================================"
echo "  CertiForge Production Bootstrap"
echo "============================================"
echo ""

# Detect package manager
if command -v pnpm &>/dev/null; then
  PKG_CMD="pnpm"
elif command -v npm &>/dev/null; then
  PKG_CMD="npm"
else
  echo "ERROR: No package manager found" >&2
  exit 1
fi

echo "[1/6] Installing dependencies..."
if [ "$PKG_CMD" = "pnpm" ]; then
  pnpm install --frozen-lockfile
else
  npm ci
fi

echo "[2/6] Verifying environment..."
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${AUTH_SECRET:?AUTH_SECRET is required}"
: "${NODE_ENV:?NODE_ENV is required (production)}"

echo "    DATABASE_URL set: $(echo "$DATABASE_URL" | cut -c1-20)..."
echo "    NODE_ENV=$NODE_ENV"

echo "[3/6] Generating Prisma client..."
cd prisma
if [ "$PKG_CMD" = "pnpm" ]; then
  pnpm prisma generate
else
  npx prisma generate
fi
cd "$ROOT"

echo "[4/6] Running migrations..."
cd prisma
if [ "$PKG_CMD" = "pnpm" ]; then
  pnpm prisma migrate deploy
else
  npx prisma migrate deploy
fi
cd "$ROOT"

echo "[5/6] Building web application..."
cd apps/web
if [ "$PKG_CMD" = "pnpm" ]; then
  pnpm build
else
  npm run build
fi
cd "$ROOT"

echo "[6/6] Building worker..."
cd apps/worker
if [ "$PKG_CMD" = "pnpm" ]; then
  pnpm build
else
  npm run build
fi
cd "$ROOT"

echo ""
echo "============================================"
echo "  Bootstrap complete"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Start the web server:  cd apps/web && pnpm start"
echo "  2. Start the worker:      cd apps/worker && pnpm start"
echo "  3. Configure your process manager (systemd, PM2, Docker)"
echo "  4. Set up HTTPS reverse proxy (nginx, Caddy)"
echo "  5. Configure backup schedule for the database"
echo ""
