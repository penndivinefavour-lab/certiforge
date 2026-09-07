# CertiForge

A professional digital certificate generation platform with two deployment modes: **Open Studio** (no account required) and **Cloud SaaS** (full authentication & persistence).

## 🚀 Quick Start

### Open Studio (No Account Required)
```bash
git clone https://github.com/penndivinefavour-lab/certiforge.git
cd certiforge
pnpm install
pnpm dev
```
Visit `http://localhost:3000` → Click "Start Creating"

### Cloud SaaS (With Database)
```bash
# Copy environment template
cp apps/web/.env.example apps/web/.env.local

# Edit .env.local with your database URL and session secret
# DATABASE_URL=postgresql://user:pass@host:5432/db
# SESSION_SECRET=your-secure-random-string-min-32-chars
# NEXT_PUBLIC_APP_URL=http://localhost:3002

pnpm dev
```

## Features

### Open Studio Mode
- ✅ Create projects without account
- ✅ Upload and edit certificate templates
- ✅ Import recipients from CSV
- ✅ Generate PDF certificates
- ✅ Download as ZIP
- ✅ Local verification
- ✅ All data stored in browser (IndexedDB)

### Cloud SaaS Mode
- ✅ User authentication (signup/signin/signout)
- ✅ Organization management
- ✅ Role-based access control
- ✅ Persistent database storage
- ✅ Public certificate verification
- ✅ Certificate revocation
- ✅ Audit logging
- ✅ Multi-device access

## Architecture

```
CERTIFORGE
    │
    ├── LANDING PAGE (/)
    │   ├── Open Studio CTA (primary)
    │   └── Sign In (secondary)
    │
    ├── OPEN STUDIO (/studio/*)
    │   ├── Browser-native persistence (IndexedDB)
    │   ├── No authentication required
    │   └── Local-only data storage
    │
    ├── AUTHENTICATED MODE (/dashboard, /auth/*)
    │   ├── PostgreSQL database
    │   ├── Organization management
    │   └── Persistent cloud storage
    │
    └── SHARED ENGINE
        ├── Certificate generation (pdf-lib)
        ├── QR code generation (qrcode)
        └── Template editing (Fabric.js)
```

### Storage Architecture

| Mode | Storage | Persistence | Verification |
|------|---------|-------------|--------------|
| Open Studio | IndexedDB (browser) | Local only | Local only |
| Cloud SaaS | PostgreSQL | Cloud | Cross-device |

## Repository Structure

```
certiforge/
├── apps/
│   ├── web/                 # Next.js web application
│   │   ├── src/app/
│   │   │   ├── studio/      # Open Studio routes
│   │   │   ├── api/studio/  # Open Studio API
│   │   │   ├── auth/        # Authentication pages
│   │   │   ├── dashboard/   # User dashboard
│   │   │   └── verify/      # Public verification
│   │   └── src/lib/
│   ├── worker/              # Background processor (optional)
│
├── packages/
│   ├── open-studio/         # IndexedDB layer
│   ├── types/               # Shared TypeScript types
│   ├── config/              # Configuration utilities
│   ├── editor/              # Visual editor components
│   ├── qr/                  # QR code generation
│   ├── validation/          # Data validation
│   ├── pdf-engine/          # PDF generation
│   ├── certificate-engine/  # Core certificate logic
│
├── docs/                    # Documentation
├── tests/                   # Test suites
├── package.json
├── pnpm-workspace.yaml
└── netlify.toml
```

## Technology Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL (raw queries, no ORM dependency)
- **Certificate Editor:** Fabric.js
- **Authentication:** bcryptjs + session cookies
- **QR Codes:** qrcode library
- **PDF Generation:** pdf-lib
- **Validation:** Zod
- **Package Manager:** pnpm v10.12.0
- **Testing:** Vitest

## Development

### Prerequisites
- Node.js 20+
- pnpm 10.12.0+
- PostgreSQL 14+ (for Cloud SaaS mode)
- Git

### Installation
```bash
git clone https://github.com/penndivinefavour-lab/certiforge.git
cd certiforge
pnpm install
```

### Commands
```bash
pnpm dev           # Start development server
pnpm build         # Production build
pnpm test          # Run test suite
pnpm typecheck     # TypeScript type checking
pnpm lint          # Linting (if configured)
```

### Database Setup (Cloud SaaS)
```sql
-- Create database and user
CREATE DATABASE certiforge;
CREATE USER certiforge WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE certiforge TO certiforge;

-- Connect and create tables
psql -U certiforge -d certiforge -f apps/web/prisma/schema.sql
```

## Deployment

### Netlify (Recommended)
See [docs/CLOUD_SAAS_DEPLOYMENT.md](docs/CLOUD_SAAS_DEPLOYMENT.md) for detailed instructions.

Quick deploy:
1. Push to GitHub
2. Connect repository in Netlify
3. Configure build: `pnpm build`, publish: `apps/web/.next`
4. Add environment variables
5. Deploy

### Open Studio Deployment
No special configuration needed — deploys as static site to any hosting provider.

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| DATABASE_URL | Cloud only | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| SESSION_SECRET | Cloud only | Minimum 32-char random string | `a1b2c3d4...` |
| NEXT_PUBLIC_APP_URL | Optional | Public app URL | `https://certiforge.netlify.app` |

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm typecheck
```

Current test status: **44/44 passing**

## Security

- Passwords hashed with bcrypt (12 rounds)
- Sessions use HTTP-only, SameSite cookies
- Parameterized SQL queries (no injection)
- File upload size limits enforced
- Filename sanitization for exports

For full security audit, see [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md).

## Documentation

- [Open Studio Guide](docs/OPEN_STUDIO_GUIDE.md)
- [Cloud SaaS Deployment](docs/CLOUD_SAAS_DEPLOYMENT.md)
- [Security Audit](docs/SECURITY_AUDIT.md)
- [Production Checklist](docs/PRODUCTION_CHECKLIST.md)

## License

MIT
