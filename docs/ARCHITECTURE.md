# CertiForge Architecture

## System Overview

CertiForge is a monorepo containing a Next.js web application and shared packages for certificate generation, verification, and management.

## Repository Structure

```
certiforge/
├── apps/
│   └── web/                    # Next.js 15 application
│       ├── src/
│       │   ├── app/            # App Router pages and API routes
│       │   │   ├── api/        # REST API endpoints
│       │   │   ├── auth/       # Authentication pages
│       │   │   ├── dashboard/  # User dashboard
│       │   │   ├── organizations/ # Organization management
│       │   │   └── projects/   # Project management
│       │   └── lib/            # Shared utilities
│       │       ├── db.ts       # Database client (raw pg)
│       │       └── auth.ts     # Authentication helpers
│       ├── public/             # Static assets
│       └── package.json
│
├── packages/
│   ├── database/               # Database layer
│   │   └── src/
│   │       ├── client.ts       # PostgreSQL client
│   │       ├── auth.ts         # Auth queries
│   │       ├── organizations.ts # Org management
│   │       ├── certificates.ts # Certificate operations
│   │       ├── generation.ts   # Generation jobs
│   │       └── recipients.ts   # Recipient handling
│   ├── types/                  # Shared TypeScript types
│   ├── qr/                     # QR code generation
│   ├── validation/             # Data validation (Zod schemas)
│   └── pdf-engine/             # PDF generation
│
├── prisma/                     # Database schema
│   └── schema.prisma
│
├── tests/                      # Test suites
│   └── unit/                   # Unit tests
│
├── docs/                       # Documentation
├── netlify.toml                # Netlify deployment config
├── package.json                # Root package.json
├── pnpm-workspace.yaml         # pnpm workspace config
└── tsconfig.json               # TypeScript config
```

## Package Dependencies

### apps/web

The main Next.js application depends on:
- `next` — React framework
- `react` / `react-dom` — UI library
- `pg` — PostgreSQL client
- `bcryptjs` — Password hashing
- `fabric` — Canvas editor
- `zod` — Validation
- `xlsx` — Excel file parsing
- `framer-motion` — Animations

### packages/database

Shared database layer providing:
- Connection management
- Query helpers
- Type-safe operations

## Data Flow

```
User → Next.js App → API Route → Database (pg) → PostgreSQL
                                ↓
                          Session/Cookie
                                ↓
                          React State
```

## API Architecture

All API routes follow this pattern:
1. Extract session cookie
2. Validate session via database
3. Check organization permissions
4. Execute business logic
5. Return JSON response

## Database Design

The schema follows a multi-tenant model:
- Users belong to Organizations via Memberships
- Organizations contain Projects
- Projects contain Templates, Recipients, and Certificates
- Certificates have QR codes and verification tokens

See [DATABASE.md](./DATABASE.md) for detailed schema documentation.
