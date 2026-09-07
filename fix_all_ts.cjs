// Fix all TypeScript errors in CertiForge workspace
const fs = require('fs');
const path = require('path');

const base = 'C:/Users/USER/certiforge';

console.log('=== CERTIFORGE TYPESCRIPT ERROR FIX ===\n');

// ============================================
// STEP 1: Fix generation/route.ts
// ============================================
console.log('1. Fixing apps/web/src/app/api/generation/route.ts...');
let content = fs.readFileSync(path.join(base, 'apps/web/src/app/api/generation/route.ts'), 'utf8');

// Add db import at top
if (!content.includes('from "@/lib/db"')) {
  content = content.replace(
    /import \{ generateVerificationToken \} from '@\/lib\/auth';/,
    `import { generateVerificationToken } from '@/lib/auth';
import { db } from '@/lib/db';`
  );
}

// Replace all prisma. with db.
content = content.replace(/prisma\.([a-zA-Z]+)/g, 'db.$1');

// Fix claimCertificateNumber calls - need year parameter
content = content.replace(
  /claimCertificateNumber\(([^,]+)\)/g,
  'claimCertificateNumber($1, new Date().getFullYear())'
);

fs.writeFileSync(path.join(base, 'apps/web/src/app/api/generation/route.ts'), content);
console.log('   ✓ Fixed\n');

// ============================================
// STEP 2: Fix imports/route.ts
// ============================================
console.log('2. Fixing apps/web/src/app/api/imports/route.ts...');
content = fs.readFileSync(path.join(base, 'apps/web/src/app/api/imports/route.ts'), 'utf8');

// Fix validateImportRows call - remove third argument
content = content.replace(
  /validateImportRows\(\s*parsed\.rows\.map\([^)]+\),\s*null,\s*projectId\s*\)/g,
  'validateImportRows(parsed.rows.map(r => ({ rowNumber: r.rowNumber, data: r.data, errors: r.errors }), mapping)'
);

// Fix validation result structure - use correct property names
content = content.replace(
  /validRecords: validation\.validRecords,\s*totalRecords: validation\.totalRecords,\s*errors: validation\.errors,\s*canGenerate: validation\.canGenerate/,
  `validRecords: validation.validRows.length,
        totalRecords: validation.total,
        errors: validation.warnings,
        canGenerate: validation.invalidRows.length === 0`
);

fs.writeFileSync(path.join(base, 'apps/web/src/app/api/imports/route.ts'), content);
console.log('   ✓ Fixed\n');

// ============================================
// STEP 3: Fix all other API routes with missing db import
// ============================================
const filesToFix = [
  'apps/web/src/app/api/organizations/[organizationId]/projects/route.ts',
  'apps/web/src/app/api/organizations/[organizationId]/templates/create/route.ts',
  'apps/web/src/app/api/projects/[projectId]/templates/upload/route.ts',
  'apps/web/src/app/api/projects/route.ts',
  'apps/web/src/app/api/projects/list/route.ts',
  'apps/web/src/app/api/templates/versions/route.ts',
  'apps/web/src/app/api/templates/versions/[versionId]/route.ts',
];

for (const file of filesToFix) {
  console.log(`3. Fixing ${file.split('/').pop()}...`);
  content = fs.readFileSync(path.join(base, file), 'utf8');
  
  // If it uses db but doesn't import it, add the import
  if (content.includes('db.') && !content.includes('from "@/lib/db"')) {
    // Find where auth import is and add db import after it
    content = content.replace(
      /(import \{.*?\} from "@\/lib\/auth";)/,
      `$1\nimport { db } from "@/lib/db";`
    );
  }
  
  // Also handle prisma references
  if (content.includes('prisma.')) {
    content = content.replace(/prisma\./g, 'db.');
    if (!content.includes('from "@/lib/db"')) {
      content = content.replace(
        /import \{.*?\} from "next\/server";/g,
        `$&\nimport { db } from "@/lib/db";`
      );
    }
  }
  
  fs.writeFileSync(path.join(base, file), content);
  console.log('   ✓ Fixed\n');
}

// ============================================
// STEP 4: Fix remaining files
// ============================================
console.log('4. Fixing remaining files...');

// projects/recipients/route.ts
content = fs.readFileSync(path.join(base, 'apps/web/src/app/api/projects/recipients/route.ts'), 'utf8');
content = content.replace(
  /const \{ page = "1", pageSize = "20", search \} = searchParams;/g,
  `const page = searchParams.get("page") || "1";
    const pageSize = searchParams.get("pageSize") || "20";
    const search = searchParams.get("search");`
);
if (!content.includes('from "@/lib/db"')) {
  content = content.replace(
    /import \{ prisma \} from "@\/lib\/db";/,
    'import { db } from "@/lib/db";'
  );
  content = content.replace(/prisma\./g, 'db.');
}
fs.writeFileSync(path.join(base, 'apps/web/src/app/api/projects/recipients/route.ts'), content);
console.log('   ✓ projects/recipients/route.ts');

// studio generate route
content = fs.readFileSync(path.join(base, 'apps/web/src/app/api/studio/projects/[projectId]/generate/route.ts'), 'utf8');
content = content.replace(
  /return new Response\(pdfBuffer\) as any;/g,
  'return new Response(pdfBuffer as unknown as BodyInit)'
);
fs.writeFileSync(path.join(base, 'apps/web/src/app/api/studio/projects/[projectId]/generate/route.ts'), content);
console.log('   ✓ studio generate route');

// edit/page.tsx
content = fs.readFileSync(path.join(base, 'apps/web/src/app/projects/[projectId]/templates/[templateId]/edit/page.tsx'), 'utf8');
content = content.replace(
  /const mod: any = fabricModule\.default \|\| fabricModule;/g,
  'const mod: any = (fabricModule as any).default || fabricModule;'
);
fs.writeFileSync(path.join(base, 'apps/web/src/app/projects/[projectId]/templates/[templateId]/edit/page.tsx'), content);
console.log('   ✓ edit/page.tsx');

// organizations template page
content = fs.readFileSync(path.join(base, 'apps/web/src/app/organizations/[organizationId]/templates/create/[templateId]/page.tsx'), 'utf8');
if (!content.includes('framer-motion')) {
  content = content.replace(
    /import \{ useState, useEffect, useRef, useCallback \} from "react";/g,
    'import { useState, useEffect, useRef, useCallback } from "react";\nimport { motion, AnimatePresence } from "framer-motion";'
  );
}
fs.writeFileSync(path.join(base, 'apps/web/src/app/organizations/[organizationId]/templates/create/[templateId]/page.tsx'), content);
console.log('   ✓ organizations template page');

console.log('\n=== ALL TYPESCRIPT FIXES APPLIED ===');
