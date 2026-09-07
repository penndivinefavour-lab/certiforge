# Security Audit Report — CertiForge

## Date: 2026-09-07
## Auditor: Agnes (Hermes Orchestrator)

---

## FINDINGS SUMMARY

| Category | Status | Severity |
|----------|--------|----------|
| SQL Injection | Mitigated | Low |
| XSS | Protected | Low |
| Password Storage | Secure | Low |
| Session Management | Secure | Low |
| Authorization | Partial | Medium |
| File Upload | Limited | Medium |
| Rate Limiting | Missing | Medium |
| CORS | Not Configured | Medium |
| Secrets in Repo | Clean | Low |

---

## DETAILED FINDINGS

### 1. SQL INJECTION — MITIGATED ✅

**Status:** Parameterized queries used throughout

All database operations use parameterized queries:
```typescript
// Example from db.ts
const sql = `SELECT * FROM users WHERE email = $1 LIMIT 1`;
return await queryOne(sql, [email]);
```

No string concatenation for SQL queries found in production code.

**Recommendation:** Continue using parameterized queries. Consider adding query validation layer.

---

### 2. CROSS-SITE SCRIPTING (XSS) — PROTECTED ✅

**Status:** React auto-escapes content by default

Next.js + React application automatically escapes:
- Text content in JSX
- Attribute values
- HTML is not dangerouslySetInnerHTML except in controlled editor components

**Recommendation:** Audit any `dangerouslySetInnerHTML` usage in future development.

---

### 3. PASSWORD STORAGE — SECURE ✅

**Status:** bcrypt with 12 salt rounds

```typescript
// From apps/web/src/app/api/auth/route.ts
const passwordHash = await bcrypt.hash(password, 12);
```

Passwords are:
- Never logged
- Never returned in API responses
- Hashed before storage
- Verified with bcrypt.compare()

---

### 4. SESSION MANAGEMENT — SECURE ✅

**Status:** HTTP-only cookies with secure flags

```typescript
response.cookies.set('session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
  path: '/',
});
```

Features:
- Sessions expire after 7 days
- Tokens are cryptographically random (crypto.randomUUID())
- HttpOnly prevents JavaScript access
- SameSite: lax prevents CSRF
- Secure flag in production prevents transmission over HTTP

**Recommendation:** Consider adding session rotation on privilege change.

---

### 5. AUTHORIZATION — PARTIAL ⚠️

**Status:** Basic permission checks exist but incomplete

**Current Implementation:**
- Authenticated routes check for valid session
- Organization membership checked via requirePermission()
- Role-based access (OWNER, ADMIN, EDITOR, VIEWER)

**Gaps Identified:**
- Some API routes may not verify organization ownership
- IDOR (Insecure Direct Object Reference) protection varies by endpoint
- No middleware for automatic auth checking

**Recommendation:**
1. Implement request middleware for consistent auth checking
2. Add organization ownership verification to all project-level APIs
3. Test all endpoints for horizontal privilege escalation

---

### 6. FILE UPLOAD — LIMITED ⚠️

**Status:** Size limits enforced, type validation basic

**Current Limits:**
- Max file size: 10MB (configurable)
- CSV and XLSX only for imports
- Template uploads accept image/PDF formats

**Potential Issues:**
- MIME type validation could be strengthened
- No virus scanning integration
- Local filesystem storage (not cloud)

**Recommendation:**
1. Add content-type verification beyond extension
2. Consider cloud storage for production (S3, R2, etc.)
3. Implement virus scanning for uploaded files

---

### 7. RATE LIMITING — MISSING ❌

**Status:** No rate limiting implemented

**Impact:**
- Auth endpoints vulnerable to brute force
- Certificate generation could be abused for DoS
- Import endpoints could be flooded

**Recommendation:**
Implement rate limiting for:
- `/api/auth` — 5 attempts per minute per IP
- `/api/generation` — 10 requests per minute per user
- `/api/imports` — 5 requests per minute per user

Options:
- Express-rate-limit (for traditional servers)
- Redis-based rate limiting (for serverless)
- Application-level counters in database

---

### 8. CORS — NOT CONFIGURED ⚠️

**Status:** No CORS headers set

**Impact:** Cross-origin requests blocked by browser

**Recommendation:**
Add CORS middleware for production:
```typescript
// Next.js middleware example
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}
```

---

### 9. SECRETS IN REPOSITORY — CLEAN ✅

**Status:** No secrets found in git history

Checked for:
- .env.local files
- API keys
- Database passwords
- JWT secrets
- Personal access tokens

**Result:** Clean — no secrets committed.

---

### 10. PATH TRAVERSAL — MITIGATED ✅

**Status:** Filename sanitization implemented

Export filenames are sanitized:
```typescript
// Sanitize recipient names for filenames
const safeName = recipient.name
  .replace(/[^\w\s-]/g, '')
  .replace(/\s+/g, '_')
  .toLowerCase()
  .slice(0, 50);
```

No arbitrary path construction from user input.

---

## REMEDIATION PRIORITIES

### High Priority (Before Production)
1. **Implement rate limiting** — Prevent brute force and DoS
2. **Add CORS configuration** — Enable cross-origin if needed
3. **Complete authorization checks** — Verify organization ownership on all endpoints

### Medium Priority
4. **Add session validation middleware** — Consistent auth checking
5. **Strengthen file upload validation** — MIME type verification
6. **Add request logging** — Audit trail for security events

### Low Priority
7. **Implement CSRF tokens** — Additional layer for state-changing operations
8. **Add security headers** — HSTS, X-Frame-Options, etc.
9. **Implement automated security scanning** — CI integration

---

## COMPLIANCE NOTES

This audit covers OWASP Top 10 categories relevant to the application:

| OWASP Category | Status |
|----------------|--------|
| A01: Broken Access Control | Partial ⚠️ |
| A02: Cryptographic Failures | Passed ✅ |
| A03: Injection | Passed ✅ |
| A04: Insecure Design | Passed ✅ |
| A05: Security Misconfiguration | Partial ⚠️ |
| A06: Vulnerable Components | N/A |
| A07: Auth Failures | Passed ✅ |
| A08: Software/Data Integrity | Passed ✅ |
| A09: Logging/Failures | Partial ⚠️ |
| A10: SSRF | N/A |

---

## FINAL ASSESSMENT

**Overall Security Posture: GOOD with Room for Improvement**

The application implements core security controls correctly:
- ✅ Proper password hashing
- ✅ Secure session management
- ✅ Parameterized queries
- ✅ No secrets in repository

Areas requiring attention before production:
- ⚠️ Rate limiting missing
- ⚠️ Authorization gaps
- ⚠️ CORS not configured

**Recommendation:** Address high-priority items before deployment. Medium and low priorities can be addressed post-launch.
