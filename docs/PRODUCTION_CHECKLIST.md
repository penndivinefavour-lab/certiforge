# CertiForge — Production Deployment Checklist

## Code Health
- [x] TypeScript: 0 errors
- [x] All workspace packages compile
- [x] Web app builds successfully
- [x] No @ts-ignore or @ts-nocheck in production code
- [x] No arbitrary `any` types in new code

## Build & Tests
- [x] `pnpm install` succeeds
- [x] `pnpm typecheck` exits 0
- [x] `pnpm test` — 44/44 passing
- [x] `pnpm build` succeeds
- [x] Next.js production build generates correct output

## Database Layer
- [x] Raw PostgreSQL queries used (no Prisma ORM dependency)
- [x] All table methods implemented in db.ts
- [x] Parameterized queries (no SQL injection)
- [x] Schema supports all required tables
- [ ] Database schema migration ready for deployment

## Authentication
- [x] Signup endpoint (/api/auth)
- [x] Signin endpoint (/api/auth)
- [x] Signout endpoint (/api/auth)
- [x] Password hashing with bcryptjs (12 rounds)
- [x] Session tokens stored securely
- [x] Cookies: httpOnly, sameSite: lax, secure in production
- [x] Session expiration (7 days)
- [ ] Session validation middleware for protected routes

## Security
- [x] SQL injection prevention (parameterized queries)
- [x] XSS prevention (React escapes by default)
- [x] Password never logged or exposed
- [x] File upload size limits (10MB max for imports)
- [x] Filename sanitization for exports
- [ ] Rate limiting on auth endpoints
- [ ] CORS configuration for production
- [ ] Content Security Policy headers

## Open Studio Mode
- [x] No authentication required
- [x] No database connection required
- [x] IndexedDB persistence works locally
- [x] Project creation without account
- [x] Template upload and storage
- [x] Recipient import (CSV)
- [x] Certificate generation
- [x] PDF download
- [x] QR code embedding
- [x] ZIP export for batch downloads
- [x] Local verification endpoint

## Cloud SaaS Mode
- [x] User signup/signin/signout
- [x] Organization management
- [x] Project management
- [x] Template management
- [x] Recipient import with validation
- [x] Certificate generation pipeline
- [x] Certificate verification
- [ ] Organization membership/role checks
- [ ] Generation job tracking
- [ ] Audit logging
- [ ] Certificate revocation

## API Routes
- [x] /api/auth — Authentication
- [x] /api/studio/* — Open Studio APIs
- [x] /api/projects/* — Project APIs
- [x] /api/templates/* — Template APIs
- [x] /api/organizations/* — Organization APIs
- [x] /api/certificates/* — Certificate APIs
- [x] /api/generation/* — Generation APIs
- [x] /api/imports/* — Import APIs
- [x] /api/session — Session verification

## Frontend Pages
- [x] / — Landing page
- [x] /studio — Open Studio entry
- [x] /studio/projects — Studio projects list
- [x] /studio/projects/[id] — Studio project detail
- [x] /studio/projects/[id]/editor — Visual editor
- [x] /studio/projects/[id]/recipients — Recipient management
- [x] /studio/projects/[id]/generate — Generation page
- [x] /studio/verify/[cert] — Verification page
- [x] /auth/signup — Registration
- [x] /auth/signin — Login
- [x] /dashboard — User dashboard
- [x] /organizations/* — Organization management
- [x] /verify/[cert] — Public verification

## Netlify Configuration
- [x] netlify.toml configured
- [x] Build command: pnpm build
- [x] Publish directory: apps/web/.next
- [x] Node version: 20
- [x] @netlify/plugin-nextjs configured
- [x] SPA fallback redirect

## Environment Variables
- [x] .env.example created with placeholders
- [x] DATABASE_URL documented
- [x] SESSION_SECRET documented
- [x] NEXT_PUBLIC_APP_URL documented
- [ ] No secrets committed to repository

## Documentation
- [ ] README.md comprehensive
- [ ] docs/ARCHITECTURE.md
- [ ] docs/DEPLOYMENT.md
- [ ] docs/DATABASE.md
- [ ] docs/OPEN_STUDIO.md
- [ ] docs/CLOUD_SAAS.md
- [ ] docs/SECURITY.md
- [ ] docs/PRODUCTION_CHECKLIST.md

## Deployment Readiness
- [ ] GitHub repository up to date
- [ ] CI/CD workflow configured (optional)
- [ ] Netlify site configured
- [ ] PostgreSQL database provisioned
- [ ] Environment variables set
- [ ] First deployment tested

## Known Limitations
- [ ] Worker package excluded from main build (needs separate setup)
- [ ] Rate limiting not implemented
- [ ] File storage uses base64 in IndexedDB (browser limit ~5MB)
- [ ] No cloud object storage integration (S3, etc.)
- [ ] Email notifications not implemented
