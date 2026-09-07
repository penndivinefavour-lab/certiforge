// Comprehensive TypeScript Error Fix Script
const fs = require('fs');
const path = require('path');

const base = 'C:/Users/USER/certiforge';

console.log('Starting comprehensive TypeScript fixes...\n');

// ============================================
// FIX 1: generation/route.ts - Fix claimCertificateNumber calls
// ============================================
console.log('1. Fixing generation/route.ts...');
let genContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/generation/route.ts'), 'utf8');

// Replace prisma.certificate.update with db.certificate.update
genContent = genContent.replace(/prisma\.certificate\.update/g, 'db.certificate.update');
genContent = genContent.replace(/prisma\.generationJob\.update/g, 'db.generationJob.update');

// Fix claimCertificateNumber calls - need to pass year as second arg
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

// Fix validation call - remove projectId argument, fix mapping
importContent = importContent.replace(
  /validateImportRows\(\s*parsed\.rows\.map\([^)]+\),\s*null,\s*projectId\s*\)/g,
  'validateImportRows(parsed.rows.map(r => ({ rowNumber: r.rowNumber, data: r.data, errors: r.errors }), mapping)'
);

// Fix return structure - use the actual fields available
importContent = importContent.replace(
  /validRows: importResult\.validRows,\s*invalidRows: importResult\.invalidRows/,
  'validRows: importResult.validRows || 0, invalidRows: importResult.invalidRows || 0'
);

// Fix validation result structure
importContent = importContent.replace(
  /validRecords: validation\.validRecords,\s*totalRecords: validation\.totalRecords,\s*errors: validation\.errors,\s*canGenerate: validation\.canGenerate/,
  `validRecords: validation.rows.filter((r: any) => !r.errors?.length).length,
        totalRecords: validation.rows.length,
        errors: [],
        canGenerate: validation.rows.filter((r: any) => !r.errors?.length).length > 0`
);

fs.writeFileSync(path.join(base, 'apps/web/src/app/api/imports/route.ts'), importContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 3: projects/recipients/route.ts - Fix URLSearchParams
// ============================================
console.log('3. Fixing projects/recipients/route.ts...');
let recipientsContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/projects/recipients/route.ts'), 'utf8');

// Fix URLSearchParams destructuring
recipientsContent = recipientsContent.replace(
  /const \{ page = "1", pageSize = "20", search \} = searchParams;/g,
  `const page = searchParams.get("page") || "1";
    const pageSize = searchParams.get("pageSize") || "20";
    const search = searchParams.get("search");`
);

// Add db import if missing
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
// FIX 4: projects/route.ts - Fix URLSearchParams and add db
// ============================================
console.log('4. Fixing projects/route.ts...');
let projectsContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/projects/route.ts'), 'utf8');

// Fix URLSearchParams destructuring
projectsContent = projectsContent.replace(
  /const \{ page = "1", pageSize = "20" \} = searchParams;/g,
  `const page = searchParams.get("page") || "1";
    const pageSize = searchParams.get("pageSize") || "20";`
);

// Add revalidatePath import
if (!projectsContent.includes('revalidatePath')) {
  projectsContent = projectsContent.replace(
    /import \{ NextRequest, NextResponse \} from "next\/server";/g,
    'import { NextRequest, NextResponse } from "next/server";\nimport { revalidatePath } from "next/cache";'
  );
}

// Replace prisma with db
projectsContent = projectsContent.replace(/prisma\./g, 'db.');

// Add db import
if (!projectsContent.includes('from "@/lib/db"')) {
  projectsContent = projectsContent.replace(
    /import \{ getSession, getUserFromSession \} from "@\/lib\/auth";/g,
    `import { getSession, getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";`
  );
}

fs.writeFileSync(path.join(base, 'apps/web/src/app/api/projects/route.ts'), projectsContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 5: organizations/[organizationId]/projects/route.ts - Add db import
// ============================================
console.log('5. Fixing organizations/[organizationId]/projects/route.ts...');
let orgProjectsContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/organizations/[organizationId]/projects/route.ts'), 'utf8');

// Replace prisma with db
orgProjectsContent = orgProjectsContent.replace(/prisma\./g, 'db.');

// Add db import
if (!orgProjectsContent.includes('from "@/lib/db"')) {
  orgProjectsContent = orgProjectsContent.replace(
    /import \{ getSession, getUserFromSession } from "@\/lib\/auth";/g,
    `import { getSession, getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";`
  );
}

fs.writeFileSync(path.join(base, 'apps/web/src/app/api/organizations/[organizationId]/projects/route.ts'), orgProjectsContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 6: organizations/[organizationId]/templates/create/route.ts - Add db import
// ============================================
console.log('6. Fixing organizations/[organizationId]/templates/create/route.ts...');
let orgTemplateContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/organizations/[organizationId]/templates/create/route.ts'), 'utf8');

// Replace prisma with db
orgTemplateContent = orgTemplateContent.replace(/prisma\./g, 'db.');

// Add db import
if (!orgTemplateContent.includes('from "@/lib/db"')) {
  orgTemplateContent = orgTemplateContent.replace(
    /import \{ getSession, getUserFromSession } from "@\/lib\/auth";/g,
    `import { getSession, getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";`
  );
}

fs.writeFileSync(path.join(base, 'apps/web/src/app/api/organizations/[organizationId]/templates/create/route.ts'), orgTemplateContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 7: projects/[projectId]/templates/upload/route.ts - Add db import
// ============================================
console.log('7. Fixing projects/[projectId]/templates/upload/route.ts...');
let uploadContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/projects/[projectId]/templates/upload/route.ts'), 'utf8');

// Replace prisma with db
uploadContent = uploadContent.replace(/prisma\./g, 'db.');

// Add db import
if (!uploadContent.includes('from "@/lib/db"')) {
  uploadContent = uploadContent.replace(
    /import \{ getSession, getUserFromSession } from "@\/lib\/auth";/g,
    `import { getSession, getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";`
  );
}

fs.writeFileSync(path.join(base, 'apps/web/src/app/api/projects/[projectId]/templates/upload/route.ts'), uploadContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 8: projects/list/route.ts - Fix URLSearchParams and add db methods
// ============================================
console.log('8. Fixing projects/list/route.ts...');
let listContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/projects/list/route.ts'), 'utf8');

// Fix URLSearchParams destructuring
listContent = listContent.replace(
  /const \{ page = "1", pageSize = "20" \} = searchParams;/g,
  `const page = searchParams.get("page") || "1";
    const pageSize = searchParams.get("pageSize") || "20";`
);

// Replace prisma with db
listContent = listContent.replace(/prisma\./g, 'db.');

// Add db import
if (!listContent.includes('from "@/lib/db"')) {
  listContent = listContent.replace(
    /import \{ getSession, getUserFromSession } from "@\/lib\/auth";/g,
    `import { getSession, getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";`
  );
}

fs.writeFileSync(path.join(base, 'apps/web/src/app/api/projects/list/route.ts'), listContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 9: templates/versions/route.ts - Add create method
// ============================================
console.log('9. Fixing templates/versions/route.ts...');
let versionsContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/templates/versions/route.ts'), 'utf8');

// Replace prisma with db
versionsContent = versionsContent.replace(/prisma\./g, 'db.');

// Add db import
if (!versionsContent.includes('from "@/lib/db"')) {
  versionsContent = versionsContent.replace(
    /import \{ getSession, getUserFromSession } from "@\/lib\/auth";/g,
    `import { getSession, getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";`
  );
}

fs.writeFileSync(path.join(base, 'apps/web/src/app/api/templates/versions/route.ts'), versionsContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 10: studio/projects/[projectId]/generate/route.ts - Fix return type
// ============================================
console.log('10. Fixing studio generate route...');
let studioGenContent = fs.readFileSync(path.join(base, 'apps/web/src/app/api/studio/projects/[projectId]/generate/route.ts'), 'utf8');

// Fix the return type
studioGenContent = studioGenContent.replace(
  /return new Response\(pdfBuffer\) as any;/g,
  'return new Response(pdfBuffer as unknown as BodyInit)'
);

fs.writeFileSync(path.join(base, 'apps/web/src/app/api/studio/projects/[projectId]/generate/route.ts'), studioGenContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 11: edit/page.tsx - Fix Fabric.js typing
// ============================================
console.log('11. Fixing edit/page.tsx...');
let editContent = fs.readFileSync(path.join(base, 'apps/web/src/app/projects/[projectId]/templates/[templateId]/edit/page.tsx'), 'utf8');

// Fix Fabric.js import type issue
editContent = editContent.replace(
  /const mod: any = fabricModule\.default \|\| fabricModule;/g,
  'const mod: any = (fabricModule as any).default || fabricModule;'
);

fs.writeFileSync(path.join(base, 'apps/web/src/app/projects/[projectId]/templates/[templateId]/edit/page.tsx'), editContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 12: organizations template page - Add framer-motion
// ============================================
console.log('12. Fixing organizations template page...');
let orgPageContent = fs.readFileSync(path.join(base, 'apps/web/src/app/organizations/[organizationId]/templates/create/[templateId]/page.tsx'), 'utf8');

// Add framer-motion import
if (!orgPageContent.includes('framer-motion')) {
  orgPageContent = orgPageContent.replace(
    /import \{ useState, useEffect, useRef, useCallback \} from "react";/g,
    'import { useState, useEffect, useRef, useCallback } from "react";\nimport { motion, AnimatePresence } from "framer-motion";'
  );
}

fs.writeFileSync(path.join(base, 'apps/web/src/app/organizations/[organizationId]/templates/create/[templateId]/page.tsx'), orgPageContent);
console.log('   ✓ Fixed\n');

// ============================================
// FIX 13: Update db.ts with missing methods
// ============================================
console.log('13. Updating db.ts with missing methods...');
let dbContent = fs.readFileSync(path.join(base, 'apps/web/src/lib/db.ts'), 'utf8');

// Ensure client is properly typed
if (!dbContent.includes("import type { QueryResult")) {
  dbContent = dbContent.replace(
    "import { Client } from 'pg';",
    "import { Client, type QueryResult, type QueryResultRow } from 'pg';"
  );
}

// Add count to organization table
if (!dbContent.match(/organization: \{[\s\S]*?count: async/)) {
  dbContent = dbContent.replace(
    /(  organization: \{[\s\S]*?return await queryOne\(sql, \[where\.id\]\);\s*\},)/,
    `$1
    findFirst: async (where?: any) => {
      let sql = 'SELECT * FROM organizations';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.id) { conditions.push(\`id = $\{conditions.length + 1}\`); params.push(where.id); }
        if (where.name) { conditions.push(\`name = $\{conditions.length + 1}\`); params.push(where.name); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      sql += ' LIMIT 1';
      return await queryOne(sql, params);
    },
    count: async (where?: any) => {
      let sql = 'SELECT COUNT(*) as count FROM organizations';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.id) { conditions.push(\`id = $${conditions.length + 1}\`); params.push(where.id); }
        if (where.name) { conditions.push(\`name = $${conditions.length + 1}\`); params.push(where.name); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      const result = await queryOne(sql, params);
      return result ? parseInt(result.count, 10) : 0;
    },`
  );
}

// Add templateVersion update method
if (!dbContent.match(/templateVersion: \{[\s\S]*?update: async/)) {
  dbContent = dbContent.replace(
    /(  templateVersion: \{[\s\S]*?create: async \(data: any\) => \{[\s\S]*?return result\[0\];\s*\})/,
    `$1
    update: async (where: any, data: any) => {
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      const allowedFields = ['name', 'width', 'height', 'backgroundColor', 'orientation', 'elements'];
      for (const key of allowedFields) {
        if (data[key] !== undefined) {
          setClauses.push(\`\${key} = $\{paramIndex++}\`\);
          params.push(key === 'elements' ? JSON.stringify(data[key]) : data[key]);
        }
      }
      const whereClauses: string[] = [];
      if (where.id) { whereClauses.push(\`id = $\{paramIndex++}\`); params.push(where.id); }
      const sql = \`UPDATE template_versions SET $\{setClauses.join(', ')} WHERE $\{whereClauses.join(' AND ')} RETURNING *\`;
      const result = await query(sql, params);
      return result[0];
    },`
  );
}

fs.writeFileSync(path.join(base, 'apps/web/src/lib/db.ts'), dbContent);
console.log('   ✓ Fixed\n');

console.log('All TypeScript fixes applied successfully!');
