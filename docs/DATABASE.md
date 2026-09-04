# CertiForge Database Documentation

## Database Technology

- **Type:** PostgreSQL 14+
- **Client:** Raw `pg` library (no ORM)
- **Migration:** Prisma schema (push mode for dev)

## Connection

```typescript
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL
});
```

## Core Tables

### users
```sql
id          UUID PK
email       VARCHAR UNIQUE NOT NULL
name        VARCHAR NOT NULL
password    VARCHAR NOT NULL  -- bcrypt hash
avatarUrl   VARCHAR
createdAt   TIMESTAMP
updatedAt   TIMESTAMP
```

### sessions
```sql
id          UUID PK
userId      UUID FK → users.id
token       VARCHAR UNIQUE NOT NULL
expiresAt   TIMESTAMP NOT NULL
createdAt   TIMESTAMP
```

### organizations
```sql
id              UUID PK
name            VARCHAR NOT NULL
slug            VARCHAR UNIQUE NOT NULL
logoUrl         VARCHAR
primaryColor    VARCHAR DEFAULT '#1a1a2e'
verificationDomain VARCHAR
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
```

### organization_members
```sql
id              UUID PK
organizationId  UUID FK → organizations.id
userId          UUID FK → users.id
role            VARCHAR DEFAULT 'VIEWER'  -- OWNER, ADMIN, EDITOR, VIEWER
createdAt       TIMESTAMP

-- Unique constraint on (organizationId, userId)
```

### projects
```sql
id              UUID PK
organizationId  UUID FK → organizations.id
name            VARCHAR NOT NULL
slug            VARCHAR NOT NULL
state           VARCHAR DEFAULT 'DRAFT'  -- DRAFT, ACTIVE, ARCHIVED
description     TEXT
createdAt       TIMESTAMP
updatedAt       TIMESTAMP

-- Unique constraint on (organizationId, slug)
```

### templates
```sql
id              UUID PK
projectId       UUID FK → projects.id
name            VARCHAR NOT NULL
description     TEXT
format          VARCHAR DEFAULT 'PDF'  -- PDF, PNG, JPG, WEBP
status          VARCHAR DEFAULT 'DRAFT'  -- DRAFT, PUBLISHED
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
```

### template_versions
```sql
id              UUID PK
templateId      UUID FK → templates.id
version         INTEGER
name            VARCHAR
width           FLOAT
height          FLOAT
backgroundColor VARCHAR DEFAULT '#ffffff'
orientation     VARCHAR DEFAULT 'PORTRAIT'
elements        TEXT  -- JSON array
background      TEXT
createdAt       TIMESTAMP
updatedAt       TIMESTAMP

-- Unique constraint on (templateId, version)
```

### template_elements
```sql
id              UUID PK
templateId      UUID FK → templates.id
versionId       UUID FK → template_versions.id
type            VARCHAR  -- TEXT, IMAGE, SHAPE, LINE, QR_CODE, SIGNATURE, SEAL
name            VARCHAR
zIndex          INTEGER DEFAULT 0
x               FLOAT
y               FLOAT
width           FLOAT
height          FLOAT
rotation        FLOAT DEFAULT 0
opacity         FLOAT DEFAULT 1
visible         BOOLEAN DEFAULT true
locked          BOOLEAN DEFAULT false
data            TEXT  -- JSON
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
```

### recipients
```sql
id              UUID PK
organizationId  UUID FK → organizations.id
projectId       UUID FK → projects.id
externalId      VARCHAR
name            VARCHAR NOT NULL
email           VARCHAR
metadata        TEXT DEFAULT '{}'  -- JSON
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
```

### certificates
```sql
id                  UUID PK
projectId           UUID FK → projects.id
recipientId         UUID FK → recipients.id
templateVersionId   UUID FK → template_versions.id
certificateNumber   VARCHAR UNIQUE NOT NULL
verificationToken   VARCHAR UNIQUE NOT NULL
status              VARCHAR DEFAULT 'DRAFT'  -- DRAFT, GENERATED, ISSUED, REVOKED
issuedAt            TIMESTAMP
revokedAt           TIMESTAMP
revocationReason    TEXT
pdfUrl              VARCHAR
qrUrl               VARCHAR
qrDataUrl           VARCHAR
metadata            TEXT DEFAULT '{}'
createdAt           TIMESTAMP
updatedAt           TIMESTAMP
```

### generation_jobs
```sql
id              UUID PK
projectId       UUID FK → projects.id
status          VARCHAR DEFAULT 'QUEUED'
total           INTEGER
completed       INTEGER DEFAULT 0
failed          INTEGER DEFAULT 0
startedAt       TIMESTAMP
completedAt     TIMESTAMP
outputUrl       VARCHAR
error           TEXT
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
```

### audit_logs
```sql
id              UUID PK
organizationId  UUID FK → organizations.id
actorId         UUID FK → users.id
action          VARCHAR NOT NULL
resourceType    VARCHAR
resourceId      VARCHAR
details         TEXT
createdAt       TIMESTAMP
```

## Entity Relationships

```
users ────< organization_members >──── organizations
                                    │
                                    └───< projects
                                              │
                                              ├───< templates
                                              │         └───< template_versions
                                              │                      └───< template_elements
                                              │
                                              ├───< recipients
                                              │
                                              └───< certificates
                                                        │
                                                        └───< generation_jobs
                                                                 │
                                                                 └───< generation_job_items
```

## Query Patterns

### Get User's Organizations
```sql
SELECT o.*, om.role, om."createdAt" as memberSince
FROM organizations o
JOIN organization_members om ON o.id = om."organizationId"
WHERE om."userId" = $1
ORDER BY o."updatedAt" DESC
```

### Get Organization Projects with Counts
```sql
SELECT p.*,
       (SELECT count(*) FROM templates t WHERE t."projectId" = p.id) as templateCount,
       (SELECT count(*) FROM certificates c WHERE c."projectId" = p.id) as certificateCount
FROM projects p
WHERE p."organizationId" = $1
```

### Get Certificate with Verification
```sql
SELECT c.*, r.name as recipient_name, r.email as recipient_email
FROM certificates c
JOIN recipients r ON c."recipientId" = r.id
WHERE c."verificationToken" = $1
```

## Migration Strategy

Development:
```bash
npx prisma db push  # Push schema changes
npx prisma db seed  # Seed demo data
```

Production:
- Use Prisma migrations or manual SQL
- Always backup before schema changes
- Test migrations in staging first
