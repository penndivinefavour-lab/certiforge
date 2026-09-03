#!/bin/bash
# CertiForge - Complete Build Script
set -e

cd /mnt/c/Users/USER/certiforge

echo "=== PHASE 1: Install Dependencies ==="
pnpm install --prefer-offline

echo "=== PHASE 2: Generate Prisma Client ==="
cd prisma
pnpm prisma generate
cd ..

echo "=== PHASE 3: Push Schema ==="
pnpm prisma db push --accept-data-loss

echo "=== PHASE 4: Seed Database ==="
pnpm tsx prisma/seed.ts

echo "=== PHASE 5: TypeCheck ==="
pnpm -r typecheck

echo "=== PHASE 6: Build Web ==="
cd apps/web
pnpm build

echo "=== BUILD COMPLETE ==="
