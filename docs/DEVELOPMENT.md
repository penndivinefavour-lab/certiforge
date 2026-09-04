# CertiForge Development Guide

## Getting Started

### Prerequisites

- **Node.js**: Version 20 or higher
- **pnpm**: Version 10.12.0 or higher
- **PostgreSQL**: Version 14 or higher
- **Git**: Latest version

### Quick Start

```bash
# Clone repository
git clone https://github.com/penndivinefavour-lab/certiforge.git
cd certiforge

# Install dependencies
pnpm install

# Setup environment
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your database credentials

# Initialize database
cd apps/web
npx prisma db push
npx prisma db seed

# Start development server
cd ../..
pnpm dev
```

Open http://localhost:3002

## Project Structure

```
certiforge/
├── apps/web/                 # Main Next.js application
│   ├── src/
│   │   ├── app/             # App Router (pages + API)
│   │   │   ├── api/         # API routes
│   │   │   ├── auth/        # Auth pages
│   │   │   ├── dashboard/   # Dashboard page
│   │   │   └── ...
│   │   └── lib/             # Utilities
│   ├── public/              # Static files
│   └── package.json
│
├── packages/                 # Shared packages
│   ├── database/            # Database client
│   ├── types/               # TypeScript types
│   └── ...
│
├── prisma/                   # Database schema
├── tests/                    # Test files
└── docs/                     # Documentation
```

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Follow existing code patterns
- Add tests for new functionality
- Update documentation as needed

### 3. Run Checks

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Tests
pnpm test

# Build
pnpm build
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add your feature"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Standards

### TypeScript

- Use strict typing where possible
- Define interfaces for complex objects
- Avoid `any` type

### API Routes

```typescript
// Standard pattern
export async function GET(request: NextRequest) {
  try {
    // 1. Validate session
    const session = await getSession(cookie);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // 2. Validate input
    const data = validateInput(request);
    
    // 3. Execute business logic
    const result = await executeLogic(data);
    
    // 4. Return response
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Database Queries

Use parameterized queries to prevent SQL injection:

```typescript
// ✅ Good
await query('SELECT * FROM users WHERE email = $1', [email]);

// ❌ Bad
await query(`SELECT * FROM users WHERE email = '${email}'`);
```

## Testing

### Running Tests

```bash
pnpm test        # Run all tests
pnpm test:watch  # Watch mode
```

### Writing Tests

Place tests in `tests/` directory:
- `tests/unit/` — Unit tests
- `tests/integration/` — Integration tests
- `tests/e2e/` — End-to-end tests (coming soon)

## Database Management

### Schema Changes

```bash
# Make changes to prisma/schema.prisma
# Then push to database
npx prisma db push
```

### Seeding Data

```bash
npx prisma db seed
```

### Reset Database

```bash
npx prisma migrate reset
```

## Environment Variables

### Development (.env.local)

```env
DATABASE_URL=postgresql://certiforge:password@localhost:5432/certiforge
SESSION_SECRET=your-dev-secret-min-32-chars
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### Production (Netlify)

Set in Netlify dashboard:
- `DATABASE_URL` — Production PostgreSQL connection
- `SESSION_SECRET` — Secure random string
- `NEXT_PUBLIC_APP_URL` — Your production URL

## Debugging

### Common Issues

1. **Database connection failed**
   - Check PostgreSQL is running
   - Verify connection string in .env.local
   - Ensure database exists

2. **Module not found**
   - Run `pnpm install`
   - Check package.json dependencies

3. **Build fails**
   - Check TypeScript errors: `pnpm typecheck`
   - Review build logs in terminal

### Logs

- Development: Terminal output
- Production: Netlify deployment logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and checks
5. Submit a pull request

See [README.md](../README.md) for more details.
