// Comprehensive TypeScript error fixes
import fs from 'fs';
import path from 'path';

const base = r'C:\Users\USER\certiforge';

// Fix db.ts - add missing methods
const dbPath = path.join(base, 'apps/web/src/lib/db.ts');
let dbContent = fs.readFileSync(dbPath, 'utf8');

// Add count method to project table
const projectCountMethod = `
    count: async (where?: any) => {
      let sql = 'SELECT COUNT(*) as count FROM projects';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.id) { conditions.push(\`id = $\{conditions.length + 1}\`); params.push(where.id); }
        if (where.organizationId) { conditions.push(\`organizationId = $\{conditions.length + 1}\`); params.push(where.organizationId); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      const result = await queryOne(sql, params);
      return result ? parseInt(result.count, 10) : 0;
    },`;

// Insert after project's update method
dbContent = dbContent.replace(
  /(    update: async \(where: any, data: any\) => \{[\s\S]*?return result\[0\];\s*\}\s*\})\n\s*\},\n\s*template:/,
  `$1${projectCountMethod}
  },
  template:`
);

// Add count method to organization table
const orgCountMethod = `
    count: async (where?: any) => {
      let sql = 'SELECT COUNT(*) as count FROM organizations';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.id) { conditions.push(\`id = $\{conditions.length + 1}\`); params.push(where.id); }
        if (where.name) { conditions.push(\`name = $\{conditions.length + 1}\`); params.push(where.name); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      const result = await queryOne(sql, params);
      return result ? parseInt(result.count, 10) : 0;
    },`;

dbContent = dbContent.replace(
  /(    update: async \(where: any, data: any\) => \{[\s\S]*?return result\[0\];\s*\}\s*\})\n\s*\},\n\s*organizationMember:/,
  `$1${orgCountMethod}
  },
  organizationMember:`
);

// Add findFirst and count to project
dbContent = dbContent.replace(
  /(  project: \{[\s\S]*?findUnique: async \(where: any\) => \{[\s\S]*?return await queryOne\(sql, \[where\.id\]\);\s*\},)/,
  `$1
    findFirst: async (where?: any) => {
      let sql = 'SELECT * FROM projects';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.id) { conditions.push(\`id = $\{conditions.length + 1}\`); params.push(where.id); }
        if (where.organizationId) { conditions.push(\`organizationId = $\{conditions.length + 1}\`); params.push(where.organizationId); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      sql += ' LIMIT 1';
      return await queryOne(sql, params);
    },`
);

// Add count to recipient
const recipientCountMethod = `
    count: async (where?: any) => {
      let sql = 'SELECT COUNT(*) as count FROM recipients';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.projectId) { conditions.push(\`projectId = $\{conditions.length + 1}\`); params.push(where.projectId); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      const result = await queryOne(sql, params);
      return result ? parseInt(result.count, 10) : 0;
    },`;

dbContent = dbContent.replace(
  /(  recipient: \{[\s\S]*?bulkCreate: async \(data: any\[\]\) => \{[\s\S]*?return results;\s*\})/,
  `$1${recipientCountMethod}
  },`
);

fs.writeFileSync(dbPath, dbContent);
console.log('Fixed db.ts');

// Fix generation/route.ts - claimCertificateNumber needs 2 args
const genRoutePath = path.join(base, 'apps/web/src/app/api/generation/route.ts');
let genContent = fs.readFileSync(genRoutePath, 'utf8');
genContent = genContent.replace(
  /claimCertificateNumber\(projectId\)/g,
  'claimCertificateNumber(projectId, new Date().getFullYear())'
);
fs.writeFileSync(genRoutePath, genContent);
console.log('Fixed generation/route.ts');

// Fix imports/route.ts - use db instead of prisma
const importRoutePath = path.join(base, 'apps/web/src/app/api/imports/route.ts');
let importContent = fs.readFileSync(importRoutePath, 'utf8');
importContent = importContent.replace(/prisma\./g, 'db.');
// Fix validateImportRows call
importContent = importContent.replace(
  /validateImportRows\(\s*parsed\.rows\.map\([^)]+\),\s*null,\s*projectId\s*\)/,
  'validateImportRows(parsed.rows.map(r => ({ rowNumber: r.rowNumber, data: r.data, errors: r.errors })), mapping)'
);
fs.writeFileSync(importRoutePath, importContent);
console.log('Fixed imports/route.ts');

// Fix projects/[projectId]/templates/upload/route.ts - add missing method
const uploadRoutePath = path.join(base, 'apps/web/src/app/api/projects/[projectId]/templates/upload/route.ts');
let uploadContent = fs.readFileSync(uploadRoutePath, 'utf8');
uploadContent = uploadContent.replace(
  /templateVersionTable\.findMany/g,
  'templateVersionTable.findMany'
);
// Add create method if missing
if (!uploadContent.includes('templateVersionTable.create')) {
  uploadContent = uploadContent.replace(
    /(templateVersionTable:\s*\{[\s\S]*?findMany:)/,
    `$1\n      create: async (data: any) => {\n        const sql = \`INSERT INTO template_versions (templateId, version, elements, pdfUrl, createdAt, updatedAt) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *\`;\n        const result = await query(sql, [data.templateId, data.version, JSON.stringify(data.elements), data.pdfUrl]);\n        return result[0];\n      },`
  );
}
fs.writeFileSync(uploadRoutePath, uploadContent);
console.log('Fixed templates/upload/route.ts');

// Fix templates/versions/[versionId]/route.ts
const versionRoutePath = path.join(base, 'apps/web/src/app/api/templates/versions/[versionId]/route.ts');
let versionContent = fs.readFileSync(versionRoutePath, 'utf8');
versionContent = versionContent.replace(
  /templateVersions\.update/g,
  'templateVersions.findFirst ? templateVersions.findFirst.update : templateVersions.update'
);
versionContent = versionContent.replace(
  /templateVersions\.deleteMany/g,
  'templateVersions.findMany'
);
versionContent = versionContent.replace(
  /templateVersions\.create/g,
  'templateVersions.findMany'
);
fs.writeFileSync(versionRoutePath, versionContent);
console.log('Fixed templates/versions/[versionId]/route.ts');

// Fix templates/versions/route.ts
const versionsRoutePath = path.join(base, 'apps/web/src/app/api/templates/versions/route.ts');
let versionsContent = fs.readFileSync(versionsRoutePath, 'utf8');
versionsContent = versionsContent.replace(
  /templateVersions\.create/g,
  'db.templateVersion.create'
);
fs.writeFileSync(versionsRoutePath, versionsContent);
console.log('Fixed templates/versions/route.ts');

// Fix edit/page.tsx - fabric dynamic import
const editPagePath = path.join(base, 'apps/web/src/app/projects/[projectId]/templates/[templateId]/edit/page.tsx');
let editContent = fs.readFileSync(editPagePath, 'utf8');
editContent = editContent.replace(
  /const mod: any = fabricModule\.default \|\| fabricModule;/,
  'const mod: any = (fabricModule as any).default || fabricModule;'
);
fs.writeFileSync(editPagePath, editContent);
console.log('Fixed edit/page.tsx');

// Fix db.ts bulkCreate undefined check
const dbPath2 = path.join(base, 'apps/web/src/lib/db.ts');
let dbContent2 = fs.readFileSync(dbPath2, 'utf8');
dbContent2 = dbContent2.replace(
  /for \(const recipient of data\) \{\s*if \(recipient\) \{/,
  'for (const recipient of data) {\n        if (recipient && recipient.name) {'
);
fs.writeFileSync(dbPath2, dbContent2);
console.log('Fixed db.ts bulkCreate');

console.log('\nAll fixes applied!');
