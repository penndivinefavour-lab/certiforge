# Open Studio Architecture Audit

## 1. Current Architecture

### 1.1 Database Layer
- **Storage**: PostgreSQL (via raw `pg` package, NOT Prisma ORM despite installation)
- **Connection**: Direct `pg` Client with connection pooling
- **Location**: `apps/web/src/lib/db.ts`
- **Models**: Users, Sessions, Organizations, Memberships, Projects, Templates, TemplateVersions, Recipients, Certificates, GenerationJobs, AuditLogs

### 1.2 Authentication System
- **Method**: Custom JWT session tokens via cookies
- **Storage**: PostgreSQL `sessions` table
- **Password hashing**: bcryptjs (12 salt rounds)
- **Location**: `apps/web/src/lib/auth.ts`
- **Session expiry**: 7 days default

### 1.3 Certificate Engine
- **PDF Generation**: `pdf-lib` library
- **QR Generation**: `qrcode` library
- **Location**: `packages/certificate-engine/src/render.ts`
- **Template format**: JSON array of elements with positions, styles, dynamic fields

### 1.4 Current Dependencies
- **Template storage**: PostgreSQL (templateVersions table)
- **Recipient storage**: PostgreSQL (recipients table)
- **Certificate storage**: PostgreSQL (certificates table)
- **Generation jobs**: PostgreSQL (generationJobs table)
- **Verification**: PostgreSQL lookup by certificateNumber

---

## 2. Authentication Dependencies

### Routes REQUIRING Authentication:
| Route | Auth Check | Purpose |
|-------|-----------|---------|
| `/api/projects` | Required | List/create projects |
| `/api/organizations/*` | Required | Organization management |
| `/api/templates/*` | Required | Template CRUD |
| `/api/certificates/*` | Required | Certificate management |
| `/api/generation` | Required | Start generation |
| `/api/imports` | Required | Import recipients |
| `/api/session` | Required | Session management |
| `/api/auth/*` | Required | Auth operations |
| `/dashboard` | Required | Dashboard page |
| `/organizations/*` | Required | Organization pages |
| `/projects/[id]/*` | Required | Project pages |

### Routes NOT Requiring Authentication:
| Route | Status | Purpose |
|-------|--------|---------|
| `/` | Public | Landing page |
| `/verify/[certificateNumber]` | Public | Certificate verification |
| `/auth/signin` | Public | Sign in page |
| `/auth/signup` | Public | Sign up page |

---

## 3. Database Dependencies

### Features Requiring PostgreSQL:
1. **Project Management** - CRUD operations on projects
2. **Template Storage** - Save/load template designs
3. **Recipient Storage** - Import and manage recipient lists
4. **Certificate Generation** - Create certificate records
5. **Generation Jobs** - Track batch generation status
6. **Verification** - Look up certificate records
7. **User Management** - Authentication and authorization

### Features That CAN Work Without Database:
1. **PDF Rendering** - `packages/certificate-engine/src/render.ts` operates on in-memory objects
2. **QR Generation** - `packages/qr/src/generator.ts` is stateless
3. **CSV/XLSX Parsing** - `packages/validation/src/` and `lib/recipients.ts` parse in memory
4. **Template Editing** - Fabric.js editor can operate on client-side state
5. **Certificate Preview** - Can render PDFs in browser without storage

---

## 4. Certificate-Generation Dependencies

### Current Flow (Auth Required):
```
Browser → POST /api/generation → DB (create records) → Worker → PDF → DB (store) → Download
```

### Components:
- **Recipient import**: `lib/recipients.ts` - parses CSV/XLSX, stores in DB
- **Generation**: `lib/generation.ts` - creates jobs, certificates in DB
- **PDF Engine**: `packages/certificate-engine/src/render.ts` - renders PDFs
- **Worker**: `apps/worker/src/index.ts` - processes generation jobs

---

## 5. Template Generation Dependencies

### Current Storage:
- Templates stored as JSON in `template_versions` table
- Elements: text, images, shapes, lines, QR codes
- Dynamic fields: `{{field_name}}` syntax
- Orientation: portrait/landscape
- Dimensions: width x height in points

### Current Dependencies:
- Database required for template persistence
- No browser-based template storage exists

---

## 6. Worker Dependencies

### Current Worker:
- Self-contained, no Redis dependency
- Processes generation jobs from database
- Uses `pdf-lib` and `qrcode` packages
- Stores output PDFs (placeholder - not yet implemented)

### Database Requirements:
- Fetches jobs from `generation_jobs` table
- Updates job status in database
- Requires database connection

---

## 7. Storage Dependencies

### Current Storage:
- **Database**: PostgreSQL for all persistent data
- **File storage**: None implemented (PDFs not persisted)
- **Session storage**: PostgreSQL + browser cookies

---

## 8. QR Verification Dependencies

### Current Flow:
```
Scan QR → /verify/[certificateNumber] → API lookup → Database query → Return certificate data
```

### Dependencies:
- Requires database lookup by certificateNumber
- Returns certificate status, recipient name, project name
- Supports revocation status

---

## 9. Routes Requiring Authentication

All routes under:
- `/api/projects/*`
- `/api/organizations/*`
- `/api/templates/*`
- `/api/certificates/*`
- `/api/generation`
- `/api/imports`
- `/api/session`
- `/api/auth/*`

And all pages under:
- `/dashboard`
- `/organizations/*`
- `/projects/*`
- `/settings`

---

## 10. Routes That Can Operate Anonymously

Currently:
- `/` (landing page)
- `/verify/[certificateNumber]` (but requires database)
- `/auth/signin`, `/auth/signup`

---

## 11. Current Supabase Dependency

**FINDING**: There is NO Supabase dependency in the current codebase.

The system uses:
- Direct PostgreSQL via `pg` package
- Custom authentication (not Supabase Auth)
- No Supabase client libraries

**Correction**: The requirement mentions "Supabase independence" but Supabase is not used. The database is plain PostgreSQL.

---

## 12. Recommended Decoupling Strategy

### Phase 1: Open Studio (Browser-Native)
- Create `/studio` route that requires NO authentication
- Use IndexedDB for local persistence
- Generate PDFs client-side using existing certificate engine
- QR codes contain self-contained verification data
- No database dependency for core workflow

### Phase 2: Anonymous Workspace
- Generate UUID for workspace (stored in IndexedDB)
- Projects, templates, recipients stored locally
- Export/import workspace as JSON file
- Sync to authenticated account when user signs in

### Phase 3: Verification
- Option A: Self-contained QR data (JSON with signed payload)
- Option B: Backend verification API for Open Studio certificates
- Option C: Hybrid - local verification + optional cloud verification

---

## 13. Risks

### Security Risks:
- Client-side certificate generation could be exploited
- Local storage may be cleared by user
- No server-side audit trail for anonymous mode

### Technical Risks:
- Large recipient lists may cause browser memory issues
- PDF generation in browser may be slow for bulk generation
- IndexedDB quota varies by browser (~50-100MB typically)

---

## 14. Migration Strategy

### Step 1: Create Open Studio Routes
- `/studio` - Main studio entry
- `/studio/projects` - Project list
- `/studio/projects/[id]` - Project workspace
- `/studio/projects/[id]/editor` - Template editor
- `/studio/projects/[id]/recipients` - Recipient management
- `/studio/projects/[id]/generate` - Certificate generation

### Step 2: Implement IndexedDB Storage
- Create `OpenStudioDB` class
- Store: projects, templates, recipients, certificates
- Auto-save on changes
- Export/import functionality

### Step 3: Client-Side Generation
- Create `/api/studio/generate` route (no auth required)
- Accept workspace data, return PDFs
- Generate certificates without database records

### Step 4: Verification
- Create `/verify/[id]` that works without database
- Use self-contained QR data or optional backend

### Step 5: Preserve Auth
- Keep all existing authentication code
- Add migration path: "Save to Account" feature

---

## 15. Architecture Decision: Open Studio Implementation

### Decision: Browser-First with Optional Backend Support

**Rationale**:
1. Core certificate generation CAN work without database
2. PDF rendering is fast in browser for moderate datasets
3. IndexedDB provides persistent local storage
4. Authentication can be added later for sync

**Implementation**:
1. Create `OpenStudioWorkspace` context
2. Use IndexedDB via `localforage` library
3. Generate PDFs client-side using existing `certificate-engine`
4. QR codes contain verification URL (may fail if backend unavailable)
5. Export workspace as JSON for backup/restore

---

## 16. Certificate ID Strategy

### For Open Studio:
- Generate UUID for each certificate
- Format: `CF-{random}` (e.g., `CF-7XK4-92PM-Q8L2`)
- Store in IndexedDB
- QR code contains: `{id, name, date, signature?}`

### For Verification:
- Option A: Self-contained QR (no server lookup)
- Option B: Backend verification endpoint
- Recommendation: Hybrid - QR contains data + optional verification endpoint

---

## 17. Storage Strategy

### Primary: IndexedDB
- Projects, templates, recipients, certificates
- Auto-save on changes
- Export/import as JSON

### Secondary: In-Memory
- Current editing session
- Temporary data during generation

### Tertiary: Backend (Optional)
- Sync to authenticated account
- Cloud backup

---

## 18. Next Steps

1. Create `docs/OPEN_STUDIO_ARCHITECTURE_AUDIT.md` (this document)
2. Implement `OpenStudioWorkspace` class
3. Create `/studio` routes
4. Implement IndexedDB storage layer
5. Create client-side generation API
6. Test complete workflow without database
7. Update documentation

---

## Summary

**Current State**: 100% database-dependent, authentication required for all workflows

**Target State**: Core certificate generation works without authentication/database, authentication preserved for future SaaS features

**Key Insight**: The certificate engine (PDF rendering, QR generation) is already database-agnostic. The dependency is in the API routes and data models.

**Approach**: Introduce a parallel Open Studio pathway that uses IndexedDB instead of PostgreSQL, while preserving all existing authenticated functionality.
