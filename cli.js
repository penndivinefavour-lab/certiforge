#!/usr/bin/env node
/**
 * CertiForge Database CLI
 * Works with npm-installed dependencies (no pnpm required)
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const command = args[0] || "help";
const cwd = process.cwd();

const pkgDir = path.join(cwd, "node_modules");

function run(cmd, cwdPath) {
  console.log(`$ ${cmd}`);
  try {
    execSync(cmd, { cwd: cwdPath || cwd, stdio: "inherit", timeout: 600000 });
  } catch (e) {
    process.exit(e.status || 1);
  }
}

function resolveBin(name) {
  const binPath = path.join(pkgDir, ".bin", name);
  if (fs.existsSync(binPath)) return binPath;
  const cmdPath = binPath + ".cmd";
  if (fs.existsSync(cmdPath)) return cmdPath;
  return null;
}

switch (command) {
  case "generate":
  case "gen":
    console.log("🔧 Generating Prisma Client...");
    const prisma = resolveBin("prisma");
    if (!prisma) {
      console.error("❌ prisma binary not found. Run 'npx prisma generate' instead.");
      process.exit(1);
    }
    run(`node "${prisma}" generate`, path.join(cwd, "packages/database"));
    break;

  case "push":
  case "db:push":
    console.log("🗄️ Pushing schema to database...");
    const prisma2 = resolveBin("prisma");
    if (!prisma2) {
      console.error("❌ prisma binary not found. Run 'npx prisma db push' instead.");
      process.exit(1);
    }
    const dbUrl = process.env.DATABASE_URL || "file:./packages/database/dev.db";
    const absDbUrl = dbUrl.startsWith("file:") && !dbUrl.startsWith("file:/")
      ? `file:${path.resolve(path.join(cwd, dbUrl.replace("file:", "")))}`
      : dbUrl;
    run(`node "${prisma2}" db push --schema=schema.prisma --accept-data-loss --url="${absDbUrl}"`, path.join(cwd, "prisma"));
    break;

  case "migrate":
  case "db:migrate":
    console.log("🗄️ Running migrations...");
    const prisma3 = resolveBin("prisma");
    if (!prisma3) {
      console.error("❌ prisma binary not found. Run 'npx prisma migrate dev' instead.");
      process.exit(1);
    }
    const dbUrl2 = process.env.DATABASE_URL || "file:./packages/database/dev.db";
    const absDbUrl2 = dbUrl2.startsWith("file:") && !dbUrl2.startsWith("file:/")
      ? `file:${path.resolve(path.join(cwd, dbUrl2.replace("file:", "")))}`
      : dbUrl2;
    run(`node "${prisma3}" migrate dev --schema=schema.prisma --url="${absDbUrl2}"`, path.join(cwd, "prisma"));
    break;

  case "seed":
  case "db:seed":
    console.log("🌱 Seeding database...");
    const tsx = resolveBin("tsx");
    if (!tsx) {
      console.error("❌ tsx binary not found. Run 'npx tsx prisma/seed.ts' instead.");
      process.exit(1);
    }
    run(`node "${tsx}" prisma/seed.ts`, cwd);
    break;

  case "studio":
  case "db:studio":
    console.log("📊 Opening Prisma Studio...");
    const prisma4 = resolveBin("prisma");
    if (!prisma4) {
      console.error("❌ prisma binary not found. Run 'npx prisma studio' instead.");
      process.exit(1);
    }
    run(`node "${prisma4}" studio`, path.join(cwd, "packages/database"));
    break;

  case "reset":
    console.log("🗑️ Resetting database...");
    const prisma5 = resolveBin("prisma");
    if (!prisma5) {
      console.error("❌ prisma binary not found. Run 'npx prisma db push --force-reset' instead.");
      process.exit(1);
    }
    const dbUrl3 = process.env.DATABASE_URL || "file:./packages/database/dev.db";
    const absDbUrl3 = dbUrl3.startsWith("file:") && !dbUrl3.startsWith("file:/")
      ? `file:${path.resolve(path.join(cwd, dbUrl3.replace("file:", "")))}`
      : dbUrl3;
    run(`node "${prisma5}" db push --schema=schema.prisma --force-reset --url="${absDbUrl3}"`, path.join(cwd, "prisma"));
    break;

  default:
    console.log(`CertiForge Database CLI

Usage: node cli.js <command>

Commands:
  generate, gen     Generate Prisma Client
  push              Push schema to database (create/update tables)
  migrate           Run migrations (dev mode)
  seed              Seed database with demo data
  studio            Open Prisma Studio GUI
  reset             Reset database (force recreate tables)
`);
}
