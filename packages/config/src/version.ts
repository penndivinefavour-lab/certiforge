// Config package - version computation (CommonJS for build-time use)
const { hashElement } = require("folder-hash");
const nodeCrypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const archiver = require("archiver");

// ── Config ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.resolve(ROOT, "public", "output");
const BUILD_CACHE = path.resolve(ROOT, "node_modules", ".certiforge-build");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// ── Hashing ───────────────────────────────────────────────────────────────────
function hashFolder(dir) {
  return new Promise((resolve, reject) => {
    hashElement(dir, { excludeHiddenFiles: true }, (err, hash) => {
      if (err) reject(err);
      else resolve(hash);
    });
  });
}

// ── Prisma status ─────────────────────────────────────────────────────────────
function prismaCanConnect() {
  try {
    const dotenv = require("dotenv");
    const { PrismaClient } = require("@prisma/client");
    dotenv.config({ path: path.resolve(ROOT, ".env") });
    const client = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL || "" } },
    });
    client.$queryRaw`SELECT 1`;
    client.$disconnect();
    return true;
  } catch {
    return false;
  }
}

// ── Image hash (deterministic from pixel data) ───────────────────────────────
function hashPng(pngPath) {
  const buf = fs.readFileSync(pngPath);
  let hash = 0;
  for (let i = 0; i < buf.length; i++) {
    hash = (hash * 31 + buf[i]) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// ── Versioning ────────────────────────────────────────────────────────────────
async function computeVersion() {
  ensureDir(BUILD_CACHE);

  const parts = [];

  // 1. Source tree hash (deterministic across builds)
  const srcPaths = [
    path.resolve(ROOT, "apps", "web", "src"),
    path.resolve(ROOT, "packages"),
    path.resolve(ROOT, "prisma", "schema.prisma"),
  ];
  for (const p of srcPaths) {
    if (fs.existsSync(p)) parts.push(`src:${await hashFolder(p)}`);
  }

  // 2. Dependency lockfile
  if (fs.existsSync(path.resolve(ROOT, "package-lock.json"))) {
    parts.push(`lock:${hashPng(path.resolve(ROOT, "package-lock.json"))}`);
  }

  // 3. Environment fingerprint (non-secret)
  const envFingerprint = {
    NODE_ENV: process.env.NODE_ENV || "development",
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
    hasDatabase: prismaCanConnect(),
  };
  parts.push(`env:${nodeCrypto.createHash("sha256").update(JSON.stringify(envFingerprint)).digest("hex").slice(0, 16)}`);

  // 4. Build timestamp (for cache busting on deploy)
  parts.push(`ts:${Date.now()}`);

  return parts.join("-");
}

// ── Write version file ────────────────────────────────────────────────────────
async function writeVersion() {
  const version = await computeVersion();
  const outPath = path.resolve(BUILD_CACHE, "app-version.json");
  fs.writeFileSync(outPath, JSON.stringify({ version, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`[certiforge-version] ${version}`);

  // Also write to public so the app can read it at runtime
  ensureDir(OUT_DIR);
  fs.writeFileSync(path.resolve(OUT_DIR, "app-version.json"), JSON.stringify({ version }, null, 2));
  return version;
}

// ── CLI ───────────────────────────────────────────────────────────────────────
if (require.main === module) {
  writeVersion().catch((err) => {
    console.error("Failed to compute version:", err);
    process.exit(1);
  });
}

module.exports = { computeVersion, writeVersion, hashFolder, hashPng, prismaCanConnect };
