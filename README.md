# CertiForge

A professional digital certificate generation platform that allows organizations to design certificate templates, import recipients in bulk, generate personalized certificates, issue unique certificate IDs, verify certificates through QR codes, and manage certificate lifecycle events including revocation.

## Features

- **Certificate Template Management** — Design and manage certificate templates with a visual editor
- **Visual Editor** — Drag-and-drop interface powered by Fabric.js for creating beautiful certificate designs
- **Dynamic Fields** — Support for variable fields (name, date, course, etc.) populated from recipient data
- **Bulk Import** — Import recipients via CSV or XLSX files with field mapping
- **Field Mapping** — Map spreadsheet columns to certificate dynamic fields
- **Validation** — Validate recipient data before generation
- **Bulk Generation** — Generate hundreds or thousands of certificates in bulk
- **PDF Generation** — Professional PDF certificates ready for printing or digital distribution
- **QR Verification** — Unique QR code on every certificate for instant authenticity verification
- **Certificate IDs** — Unique certificate numbers for tracking and reference
- **Revocation** — Revoke certificates with reason logging
- **Audit Logging** — Track all certificate lifecycle events
- **Organization/Workspace Architecture** — Multi-tenant support with role-based access control
- **Authentication** — Secure email/password authentication with session management

## How CertiForge Works

1. **Create Project** — Set up a new certificate project within your organization
2. **Upload Template** — Upload a certificate template image or design from scratch
3. **Open Visual Editor** — Use the Fabric.js-based editor to position elements
4. **Add Dynamic Fields** — Insert text fields that pull data from recipient spreadsheets
5. **Import Recipients** — Upload a CSV or XLSX file with recipient data
6. **Map Columns** — Map spreadsheet columns to certificate fields (name, email, course, etc.)
7. **Validate** — Check for missing or invalid data before generation
8. **Generate Certificates** — Create personalized certificates in bulk
9. **Download PDFs** — Download individual or batch PDF certificates
10. **Verify Certificates** — Scan QR codes or enter certificate numbers to verify authenticity
11. **Revoke** — Revoke certificates when necessary with audit trail

**Note:** Steps 8-11 are partially implemented. The generation pipeline and verification endpoint are in development.

## Architecture

```
certiforge/
├── apps/
│   ├── web/                 # Next.js web application
│   └── worker/              # Background job processor (simplified)
│
├── packages/
│   ├── database/            # Database client and queries
│   ├── types/               # Shared TypeScript types
│   ├── config/              # Configuration utilities
│   ├── editor/              # Certificate editor components
│   ├── qr/                  # QR code generation
│   ├── validation/          # Data validation
│   ├── pdf-engine/          # PDF generation engine
│   └── certificate-engine/  # Core certificate logic
│
├── prisma/                  # Database schema
├── docs/                    # Documentation
├── tests/                   # Test suites
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Technology Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Custom CSS design system (Tailwind v4-compatible)
- **Database:** PostgreSQL with raw pg queries
- **Certificate Editor:** Fabric.js
- **Authentication:** bcryptjs + session cookies
- **QR Codes:** qrcode library
- **PDF Generation:** Custom PDF engine
- **Validation:** Zod
- **Package Manager:** pnpm v10
- **Testing:** Vitest

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 10.12.0+
- PostgreSQL 14+
- Git

### Installation

```bash
git clone https://github.com/penndivinefavour-lab/certiforge.git
cd certiforge
pnpm install
```

### Environment Setup

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and configure:

```env
DATABASE_URL=postgresql://certiforge:your_password@localhost:5432/certiforge
SESSION_SECRET=replace-with-a-secure-random-32-char-minimum-string
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### Database Setup

```bash
# Create database and user
psql -U postgres -c "CREATE USER certiforge WITH PASSWORD 'your_password';"
psql -U postgres -c "CREATE DATABASE certiforge OWNER certiforge;"

# Push schema
cd apps/web
npx prisma db push
npx prisma db seed
```

### Development Server

```bash
pnpm dev
```

Open http://localhost:3002 in your browser.

### Demo Credentials (Development Only)

| Email | Password | Role |
|-------|----------|------|
| admin@certiforge.demo | demo1234 | Admin |

**WARNING:** These are development credentials only. Do not use in production.

## Database Schema

CertiForge uses PostgreSQL with the following core tables:

- **users** — User accounts with email, name, password hash
- **sessions** — Active user sessions with expiration
- **organizations** — Multi-tenant workspaces
- **organization_members** — User-organization relationships with roles
- **projects** — Certificate projects within organizations
- **templates** — Certificate template definitions
- **template_versions** — Versioned template designs
- **template_elements** — Individual design elements (text, image, QR)
- **recipients** — Certificate recipients with custom metadata
- **certificates** — Generated certificates with verification tokens
- **generation_jobs** — Bulk generation task tracking
- **audit_logs** — Activity tracking

## Authentication

CertiForge uses session-based authentication:

- **Signup** — Email, name, password (hashed with bcrypt)
- **Signin** — Email/password verification
- **Sessions** — Cookie-based with configurable expiration (7 days default)
- **Protected Routes** — API routes validate session tokens
- **Organization Authorization** — Role-based access (OWNER, ADMIN, EDITOR, VIEWER)

## Certificate Generation

The generation pipeline works as follows:

```
Recipient Data (CSV/XLSX)
        ↓
   Field Mapping
        ↓
   Template + Data
        ↓
   Certificate Engine
        ↓
      PDF Output
        ↓
  Certificate Record + QR
```

## Deploying to Netlify

### Prerequisites

- GitHub repository with the code
- PostgreSQL database (e.g., Supabase, Railway, PlanetScale)
- Netlify account

### Steps

1. Push this repository to GitHub
2. Log in to Netlify dashboard
3. Click "Add new site" → "Import an existing project"
4. Select your GitHub repository
5. Configure build settings:
   - **Build command:** `pnpm build`
   - **Publish directory:** `apps/web/.next`
   - **Base directory:** Leave empty
6. Add environment variables (see below)
7. Click "Deploy site"

### Required Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| DATABASE_URL | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| SESSION_SECRET | Yes | Minimum 32-character secret | `aabbccdd...` |
| NEXT_PUBLIC_APP_URL | No | Public URL of the site | `https://certiforge.netlify.app` |

### Production Database

**Important:** The local PostgreSQL instance in WSL is for development only. Netlify cannot connect to localhost.

You must provision a production PostgreSQL database. Recommended providers:
- **Supabase** — Free tier available, managed PostgreSQL
- **Railway** — Pay-per-use, easy setup
- **PlanetScale** — MySQL-compatible (requires adapter)
- **Neon** — Serverless PostgreSQL

After provisioning, set `DATABASE_URL` to your production connection string.

## Testing

```bash
pnpm test        # Run all tests
pnpm typecheck   # TypeScript type checking
pnpm lint        # Linting
pnpm build       # Production build
```

**Current test status:** 21/21 passing

## Project Status

**Status:** Active development — Deployment preparation in progress

### Completed
- Authentication system (signup/signin/session)
- Organization and membership management
- Database layer with raw PostgreSQL queries
- Certificate template editor (Fabric.js)
- Recipient import and validation
- Basic API routes

### In Progress
- Certificate generation pipeline
- PDF export
- QR code generation
- Dashboard UI

### Known Limitations
- Dashboard shows loading state indefinitely (organization API returns empty)
- Full end-to-end certificate generation not yet verified
- No production database connectivity tested
- Some API routes still reference Prisma (migration in progress)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Write tests for new features
- Update documentation as needed
- Do not commit `.env` files or secrets

## Security

- Never commit `.env` files or credentials
- Use environment variables for all secrets
- Certificate verification endpoints should only expose public information
- Report security issues responsibly

## License

License: To be determined
