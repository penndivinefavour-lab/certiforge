#!/bin/bash
# CertiForge dev orchestration script
# Run from repo root

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

cd "$ROOT"

# Detect environment
if command -v pnpm &>/dev/null; then
  PKG_CMD="pnpm"
elif command -v npm &>/dev/null; then
  PKG_CMD="npm"
else
  echo "ERROR: Neither pnpm nor npm found" >&2
  exit 1
fi

echo "==> Using package manager: $PKG_CMD"
echo "==> Root: $ROOT"

# ── Install ────────────────────────────────────────────────────────────────────
install() {
  echo "==> Installing dependencies..."
  if [ "$PKG_CMD" = "pnpm" ]; then
    pnpm install
  else
    npm install
  fi
}

# ── Prisma generate ───────────────────────────────────────────────────────────
db_generate() {
  echo "==> Generating Prisma client..."
  cd prisma
  if [ "$PKG_CMD" = "pnpm" ]; then
    pnpm prisma generate
  else
    npx prisma generate
  fi
  cd "$ROOT"
}

# ── DB push (dev only) ────────────────────────────────────────────────────────
db_push() {
  echo "==> Pushing schema to database..."
  cd prisma
  if [ "$PKG_CMD" = "pnpm" ]; then
    pnpm prisma db push
  else
    npx prisma db push
  fi
  cd "$ROOT"
}

# ── Seed ───────────────────────────────────────────────────────────────────────
db_seed() {
  echo "==> Seeding database..."
  if [ "$PKG_CMD" = "pnpm" ]; then
    pnpm tsx prisma/seed.ts
  else
    npx tsx prisma/seed.ts
  fi
}

# ── Dev server ────────────────────────────────────────────────────────────────
dev() {
  echo "==> Starting Next.js dev server on http://localhost:3000"
  echo "==> Restart with Ctrl+C"
  cd apps/web
  if [ "$PKG_CMD" = "pnpm" ]; then
    pnpm dev
  else
    npm run dev
  fi
}

# ── Build ──────────────────────────────────────────────────────────────────────
build() {
  echo "==> Building web app..."
  cd apps/web
  if [ "$PKG_CMD" = "pnpm" ]; then
    pnpm build
  else
    npm run build
  fi
  cd "$ROOT"
}

# ── Worker ─────────────────────────────────────────────────────────────────────
worker() {
  echo "==> Starting generation worker..."
  cd apps/worker
  if [ "$PKG_CMD" = "pnpm" ]; then
    pnpm dev
  else
    npm run dev
  fi
}

# ── Test ───────────────────────────────────────────────────────────────────────
test() {
  echo "==> Running unit tests..."
  if [ "$PKG_CMD" = "pnpm" ]; then
    pnpm test
  else
    npm test
  fi
}

# ── Typecheck ─────────────────────────────────────────────────────────────────
typecheck() {
  echo "==> Running typecheck..."
  cd apps/web
  if [ "$PKG_CMD" = "pnpm" ]; then
    pnpm typecheck
  else
    npm run typecheck
  fi
  cd "$ROOT"
}

# ── Lint ───────────────────────────────────────────────────────────────────────
lint() {
  echo "==> Running lint..."
  cd apps/web
  if [ "$PKG_CMD" = "pnpm" ]; then
    pnpm lint
  else
    npm run lint
  fi
  cd "$ROOT"
}

# ── CLI ────────────────────────────────────────────────────────────────────────
case "${1:-}" in
  install)   install ;;
  db:gen)    db_generate ;;
  db:push)   db_push ;;
  db:seed)   db_seed ;;
  dev)       dev ;;
  build)     build ;;
  worker)    worker ;;
  test)      test ;;
  typecheck) typecheck ;;
  lint)      lint ;;
  all)       install && db_generate && db_push && db_seed && dev ;;
  *)

echo "CertiForge dev orchestration"
echo ""
echo "Usage: ./dev.sh <command>"
echo ""
echo "Commands:"
echo "  install    Install all dependencies"
echo "  db:gen     Generate Prisma client"
echo "  db:push    Push schema to dev database"
echo "  db:seed    Seed development database"
echo "  dev        Start Next.js dev server (localhost:3000)"
echo "  build      Build production bundle"
echo "  worker     Start generation worker"
echo "  test       Run tests"
echo "  typecheck  Run TypeScript type checking"
echo "  lint       Run linting"
echo "  all        Install + generate + push + seed + dev (full bootstrap)"
echo ""
echo "Environment:"
echo "  DATABASE_URL    PostgreSQL connection string"
echo "  JWT_SECRET      Secret for signing sessions"
echo "  AUTH_SECRET     NextAuth secret (if using NextAuth)"
echo "  OPENAI_API_KEY  OpenAI API key (for AI design features)"
;;
esac
