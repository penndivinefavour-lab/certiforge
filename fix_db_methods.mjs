// Fix all TypeScript errors properly
import fs from 'fs';
import path from 'path';

const base = 'C:/Users/USER/certiforge';

// Read and fix db.ts - ensure db is exported with count and findFirst methods
let dbContent = fs.readFileSync(path.join(base, 'apps/web/src/lib/db.ts'), 'utf8');

// Add missing methods to project table
if (!dbContent.includes('project: {\n    findUnique') || !dbContent.match(/project: \{[\s\S]*?findFirst: async/)) {
  // Find where project table is defined and add methods
  const projectMethods = `    findFirst: async (where?: any) => {
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
    },
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
  
  dbContent = dbContent.replace(
    /(project: \{[\s\S]*?return await queryOne\(sql, \[where\.id\]\);\s*\},)/,
    `$1${projectMethods}`
  );
}

// Add missing methods to organization table
if (!dbContent.match(/organization: \{[\s\S]*?findFirst: async/)) {
  const orgMethods = `
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
        if (where.id) { conditions.push(\`id = $\{conditions.length + 1}\`); params.push(where.id); }
        if (where.name) { conditions.push(\`name = $\{conditions.length + 1}\`); params.push(where.name); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      const result = await queryOne(sql, params);
      return result ? parseInt(result.count, 10) : 0;
    },`;
  
  dbContent = dbContent.replace(
    /(organization: \{[\s\S]*?return await queryOne\(sql, \[where\.id\]\);\s*\},)/,
    `$1${orgMethods}`
  );
}

// Add count to recipient table
if (!dbContent.match(/recipient: \{[\s\S]*?count: async/)) {
  const recipientCount = `
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
    /(bulkCreate: async \(data: any\[\]\) => \{[\s\S]*?return results;\s*\})/,
    `$1${recipientCount}`
  );
}

// Fix bulkCreate undefined check
dbContent = dbContent.replace(
  /for \(const recipient of data\) \{\s*if \(recipient\) \{/g,
  'for (const recipient of data) {\n        if (recipient && recipient.name) {'
);

// Add templateVersion create and update methods
if (!dbContent.match(/templateVersion: \{[\s\S]*?create: async/)) {
  const templateVersionMethods = `
    create: async (data: any) => {
      const sql = \`INSERT INTO template_versions (templateId, version, elements, pdfUrl, backgroundColor, orientation, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *\`;
      const result = await query(sql, [data.templateId, data.version, JSON.stringify(data.elements), data.pdfUrl, data.backgroundColor, data.orientation]);
      return result[0];
    },
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
    },`;
  
  dbContent = dbContent.replace(
    /(templateVersion: \{[\s\S]*?findFirst: async \(where\?: any\) => \{[\s\S]*?return await queryOne\(sql, params\);\s*\},)/,
    `$1${templateVersionMethods}`
  );

fs.writeFileSync(path.join(base, 'apps/web/src/lib/db.ts'), dbContent);
console.log('✓ Fixed db.ts with all missing methods');
