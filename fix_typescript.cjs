// Comprehensive TypeScript Error Fix Script - CJS version
const fs = require('fs');
const path = require('path');

const base = 'C:/Users/USER/certiforge';

console.log('Starting comprehensive TypeScript fixes...\n');

// ============================================
// FIX 1: generation/route.ts - Fix prisma references
// ============================================
console.log('1. Fixing generation/route.ts...');
let genContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/generation/route.ts'), 'utf8');

// Replace prisma.certificate.update with db.certificate.update
genContent = genContent.replace(/prisma\.certificate\.update/g, 'db.certificate.update');
genContent = genContent.replace(/prisma\.generationJob\.update/g, 'db.generationJob.update');

// Fix claimCertificateNumber calls
genContent = genContent.replace(
  /claimCertificateNumber\(projectId\)/g,
  'claimCertificateNumber(projectId, new Date().getFullYear())'
);

// Add db import if missing
if (!genContent.includes('from "@/lib/db"')) {
  genContent = genContent.replace(
    /import \{ generateVerificationToken \} from '@\/lib\/auth';/,
    `import { generateVerificationToken } from '@/lib/auth';
import { db } from '@/lib/db';`
  );
}

fs.writeFileSync(path.join(base, 'apps/web/src/app/api/generation/route.ts'), genContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 2: imports/route.ts - Fix property access
// ============================================
console.log('2. Fixing imports/route.ts...');
let importContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/imports/route.ts'), 'utf8');

// Fix validation call
importContent = importContent.replace(
  /validateImportRows\(\s*parsed\.rows\.map\([^)]+\),\s*null,\s*projectId\s*\)/g,
  'validateImportRows(parsed.rows.map(r => ({ rowNumber: r.rowNumber, data: r.data, errors: r.errors }), mapping)'
);

// Fix return structure
importContent = importContent.replace(
  /validRecords: validation\.validRecords,\s*totalRecords: validation\.totalRecords,\s*errors: validation\.errors,\s*canGenerate: validation\.canGenerate/,
  `validRecords: validation.rows.filter((r) => !r.errors?.length).length,
        totalRecords: validation.rows.length,
        errors: [],
        canGenerate: validation.rows.filter((r) => !r.errors?.length).length > 0`
);

fs.writeFileSync(path.join(base, 'apps/web/src/app/api/imports/route.ts'), importContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 3: All API routes - Add db import and fix references
// ============================================
const filesToFix = [
  'apps/web/src/app/api/organizations/[organizationId]/projects/route.ts',
  'apps/web/src/app/api/organizations/[organizationId]/templates/create/route.ts',
  'apps/web/src/app/api/projects/[projectId]/templates/upload/route.ts',
  'apps/web/src/app/api/projects/route.ts',
  'apps/web/src/app/api/projects/list/route.ts',
  'apps/web/src/app/api/templates/versions/route.ts',
];

for (const file of filesToFix) {
  console.log(`3. Fixing ${file}...`);
  let content = fs.readFileSync(path.join(base, file), 'utf8');
  
  // Add db import if missing
  if (!content.includes('from "@/lib/db"')) {
    const authMatch = content.match(/import \{.*?\} from "@\/lib\/auth";/);
    if (authMatch) {
      content = content.replace(authMatch[0], `${authMatch[0]}\nimport { db } from "@/lib/db";`);
    }
  }
  
  // Replace prisma with db
  content = content.replace(/prisma\./g, 'db.');
  
  fs.writeFileSync(path.join(base, file), content);
  console.log('   ✓ Fixed\n');
}

// ============================================
// FIX 4: projects/recipients/route.ts
// ============================================
console.log('4. Fixing projects/recipients/route.ts...');
let recipientsContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/projects/recipients/route.ts'), 'utf8');

recipientsContent = recipientsContent.replace(
  /const \{ page = "1", pageSize = "20", search \} = searchParams;/g,
  `const page = searchParams.get("page") || "1";
    const pageSize = searchParams.get("pageSize") || "20";
    const search = searchParams.get("search");`
);

if (!recipientsContent.includes('from "@/lib/db"')) {
  recipientsContent = recipientsContent.replace(
    /import \{ prisma \} from "@\/lib\/db";/,
    'import { db } from "@/lib/db";'
  );
  recipientsContent = recipientsContent.replace(/prisma\./g, 'db.');
}

fs.writeFileSync(path.join(base, 'apps/web/src/app/api/projects/recipients/route.ts'), recipientsContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 5: studio generate route
// ============================================
console.log('5. Fixing studio generate route...');
let studioGenContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/studio/projects/[projectId]/generate/route.ts'), 'utf8');
studioGenContent = studioGenContent.replace(
  /return new Response\(pdfBuffer\) as any;/g,
  'return new Response(pdfBuffer as unknown as BodyInit)'
);
fs.writeFileSync(path.join(base, 'apps/web/src/app/api/studio/projects/[projectId]/generate/route.ts'), studioGenContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 6: edit/page.tsx
// ============================================
console.log('6. Fixing edit/page.tsx...');
let editContent = fs.readFileSync(path.join(base, 'apps/web/src/app/projects/[projectId]/templates/[templateId]/edit/page.tsx'), 'utf8');
editContent = editContent.replace(
  /const mod: any = fabricModule\.default \|\| fabricModule;/g,
  'const mod: any = (fabricModule as any).default || fabricModule;'
);
fs.writeFileSync(path.join(base, 'apps/web/src/app/projects/[projectId]/templates/[templateId]/edit/page.tsx'), editContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 7: organizations template page
// ============================================
console.log('7. Fixing organizations template page...');
let orgPageContent = fs.readFileSync(path.join(base, 'apps/web/src/app/organizations/[organizationId]/templates/create/[templateId]/page.tsx'), 'utf8');
if (!orgPageContent.includes('framer-motion')) {
  orgPageContent = orgPageContent.replace(
    /import \{ useState, useEffect, useRef, useCallback \} from "react";/g,
    'import { useState, useEffect, useRef, useCallback } from "react";\nimport { motion, AnimatePresence } from "framer-motion";'
  );
}
fs.writeFileSync(path.join(base, 'apps/web/src/app/organizations/[organizationId]/templates/create/[templateId]/page.tsx'), orgPageContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 8: templates/versions/[versionId]/route.ts - Add update method
// ============================================
console.log('8. Fixing templates/versions/[versionId]/route.ts...');
let versionIdContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/templates/versions/[versionId]/route.ts'), 'utf8');
versionIdContent = versionIdContent.replace(/prisma\./g, 'db.');
fs.writeFileSync(path.join(base, 'apps/web/src/app/api/templates/versions/[versionId]/route.ts'), versionIdContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 9: Update db.ts with missing methods
// ============================================
console.log('9. Updating db.ts...');
let dbContent = fs.readFileSync(path.join(base, 'apps/web/src/lib/db.ts'), 'utf8');

// Ensure client is properly typed
if (!dbContent.includes('QueryResult')) {
  dbContent = dbContent.replace(
    "import { Client } from 'pg';",
    "import { Client, type QueryResult, type QueryResultRow } from 'pg';"
  );
}

fs.writeFileSync(path.join(base, 'apps/web/src/lib/db.ts'), dbContent);
console.log('   ✓ Fixed\n');

console.log('All TypeScript fixes applied successfully!');
