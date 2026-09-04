# CertiForge Testing Guide

## Test Suite

CertiForge uses **Vitest** for unit and integration testing.

### Running Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run specific test file
pnpm test tests/unit/certificates.test.ts
```

## Current Test Status

| Test Suite | Status | Count |
|------------|--------|-------|
| Unit Tests | ✅ PASS | 21 |
| Integration Tests | ✅ PASS | Included |
| E2E Tests | 🚧 TODO | Not implemented |

## Test Structure

```
tests/
├── unit/
│   ├── certificates.test.ts      # Certificate generation
│   ├── validation.test.ts        # Input validation
│   ├── qr.test.ts                # QR code generation
│   ├── text-fitting.test.ts      # Text layout calculations
│   └── serialization.test.ts     # Data serialization
│
└── integration/
    └── workflow.test.ts          # End-to-end workflow
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { generateCertificate } from '@/lib/certificates';

describe('Certificate Generation', () => {
  it('should generate a certificate with unique number', () => {
    const cert = generateCertificate({
      recipient: { name: 'John Doe' },
      template: { id: '123' },
    });
    
    expect(cert.certificateNumber).toBeDefined();
    expect(cert.verificationToken).toBeDefined();
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { query } from '@/lib/db';

describe('Database Integration', () => {
  it('should connect to database', async () => {
    const result = await query('SELECT 1 as test');
    expect(result).toHaveLength(1);
    expect(result[0].test).toBe(1);
  });
});
```

## Test Coverage Goals

- [x] Authentication flows
- [x] Database queries
- [x] Certificate generation
- [x] QR code generation
- [x] Validation logic
- [ ] API route handlers
- [ ] Frontend components
- [ ] Deployment pipeline

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to master branch
- Manual workflow trigger

## Troubleshooting

### Tests Failing Locally

1. Ensure database is running
2. Check environment variables
3. Run `pnpm install`
4. Check for TypeScript errors

### Mocking Database

```typescript
import { vi } from 'vitest';
import * as db from '@/lib/db';

vi.mock('@/lib/db', () => ({
  query: vi.fn().mockResolvedValue([{ id: '123' }]),
  queryOne: vi.fn().mockResolvedValue({ id: '123' }),
  execute: vi.fn().mockResolvedValue(undefined),
}));
```
