// CertiForge Database Client - Hybrid: Raw queries + Prisma-like interface
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://certiforge:***@localhost:5432/certiforge';

const client = new Client({ connectionString: DATABASE_URL });

async function connect(): Promise<boolean> {
  try {
    await client.connect();
    return true;
  } catch (error) {
    console.error('Database connection error:', (error as Error).message);
    return false;
  }
}

async function disconnect(): Promise<void> {
  await client.end();
}

async function query(text: string, params?: any[]): Promise<any[]> {
  await connect();
  const result = await client.query(text, params);
  return result.rows;
}

async function queryOne(text: string, params?: any[]): Promise<any | null> {
  await connect();
  const result = await client.query(text, params);
  return result.rows[0] || null;
}

async function execute(text: string, params?: any[]): Promise<void> {
  await connect();
  await client.query(text, params);
}

// Prisma-like table interface for backward compatibility
const db = {
  // Helper methods
  query,
  queryOne,
  execute,
  
  // Table accessors (for backward compatibility with Prisma-style code)
  user: {
    findUnique: async (where: any) => {
      const sql = `SELECT * FROM users WHERE email = $1 OR id = $2 LIMIT 1`;
      return await queryOne(sql, [where.email, where.id]);
    },
    findMany: async (where?: any, options?: any) => {
      let sql = 'SELECT * FROM users';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.email) { conditions.push(`email = $${conditions.length + 1}`); params.push(where.email); }
        if (where.id) { conditions.push(`id = $${conditions.length + 1}`); params.push(where.id); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      if (options?.take) sql += ` LIMIT ${options.take}`;
      if (options?.skip) sql += ` OFFSET ${options.skip}`;
      return await query(sql, params);
    },
    create: async (data: any) => {
      const sql = `INSERT INTO users (email, name, passwordHash, createdAt, updatedAt) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`;
      const result = await query(sql, [data.email, data.name, data.passwordHash]);
      return result[0];
    },
    update: async (where: any, data: any) => {
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      const allowedFields = ['email', 'name', 'passwordHash', 'isActive'];
      for (const key of allowedFields) {
        if (data[key] !== undefined) {
          setClauses.push(`${key} = $${paramIndex++}`);
          params.push(data[key]);
        }
      }
      
      const whereClauses: string[] = [];
      if (where.email) { whereClauses.push(`email = $${paramIndex++}`); params.push(where.email); }
      if (where.id) { whereClauses.push(`id = $${paramIndex++}`); params.push(where.id); }
      
      const sql = `UPDATE users SET ${setClauses.join(', ')}, updatedAt = NOW() WHERE ${whereClauses.join(' AND ')} RETURNING *`;
      const result = await query(sql, params);
      return result[0];
    },
    delete: async (where: any) => {
      const sql = `DELETE FROM users WHERE email = $1 OR id = $2 RETURNING *`;
      const result = await query(sql, [where.email, where.id]);
      return result[0];
    }
  },
  
  session: {
    findUnique: async (where: any) => {
      const sql = `SELECT * FROM sessions WHERE token = $1 OR userId = $2 LIMIT 1`;
      return await queryOne(sql, [where.token, where.userId]);
    },
    findMany: async (where?: any) => {
      let sql = 'SELECT * FROM sessions';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.token) { conditions.push(`token = $${conditions.length + 1}`); params.push(where.token); }
        if (where.userId) { conditions.push(`userId = $${conditions.length + 1}`); params.push(where.userId); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      return await query(sql, params);
    },
    create: async (data: any) => {
      const sql = `INSERT INTO sessions (userId, token, expiresAt, createdAt) VALUES ($1, $2, $3, NOW()) RETURNING *`;
      const result = await query(sql, [data.userId, data.token, data.expiresAt]);
      return result[0];
    },
    delete: async (where: any) => {
      const sql = `DELETE FROM sessions WHERE token = $1 OR userId = $2`;
      await execute(sql, [where.token, where.userId]);
    }
  },
  
  organization: {
    findUnique: async (where: any) => {
      const sql = `SELECT * FROM organizations WHERE id = $1 OR name = $2 LIMIT 1`;
      return await queryOne(sql, [where.id, where.name]);
    },
    findMany: async (where?: any) => {
      let sql = 'SELECT * FROM organizations';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.id) { conditions.push(`id = $${conditions.length + 1}`); params.push(where.id); }
        if (where.name) { conditions.push(`name = $${conditions.length + 1}`); params.push(where.name); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      return await query(sql, params);
    },
    create: async (data: any) => {
      const sql = `INSERT INTO organizations (name, description, createdAt, updatedAt) VALUES ($1, $2, NOW(), NOW()) RETURNING *`;
      const result = await query(sql, [data.name, data.description]);
      return result[0];
    },
    update: async (where: any, data: any) => {
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      const allowedFields = ['name', 'description', 'isActive'];
      for (const key of allowedFields) {
        if (data[key] !== undefined) {
          setClauses.push(`${key} = $${paramIndex++}`);
          params.push(data[key]);
        }
      }
      
      const whereClauses: string[] = [];
      if (where.id) { whereClauses.push(`id = $${paramIndex++}`); params.push(where.id); }
      
      const sql = `UPDATE organizations SET ${setClauses.join(', ')}, updatedAt = NOW() WHERE ${whereClauses.join(' AND ')} RETURNING *`;
      const result = await query(sql, params);
      return result[0];
    }
  },
  
  organizationMember: {
    findUnique: async (where: any) => {
      const sql = `SELECT * FROM organization_members WHERE id = $1 OR (organizationId = $2 AND userId = $3) LIMIT 1`;
      return await queryOne(sql, [where.id, where.organizationId, where.userId]);
    },
    findMany: async (where?: any) => {
      let sql = 'SELECT * FROM organization_members';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.organizationId) { conditions.push(`organizationId = $${conditions.length + 1}`); params.push(where.organizationId); }
        if (where.userId) { conditions.push(`userId = $${conditions.length + 1}`); params.push(where.userId); }
        if (where.role) { conditions.push(`role = $${conditions.length + 1}`); params.push(where.role); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      return await query(sql, params);
    },
    create: async (data: any) => {
      const sql = `INSERT INTO organization_members (organizationId, userId, role, createdAt) VALUES ($1, $2, $3, NOW()) RETURNING *`;
      const result = await query(sql, [data.organizationId, data.userId, data.role]);
      return result[0];
    }
  },
  
  project: {
    findUnique: async (where: any) => {
      const sql = `SELECT * FROM projects WHERE id = $1 LIMIT 1`;
      return await queryOne(sql, [where.id]);
    },
    findMany: async (where?: any) => {
      let sql = 'SELECT * FROM projects';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.organizationId) { conditions.push(`organizationId = $${conditions.length + 1}`); params.push(where.organizationId); }
        if (where.id) { conditions.push(`id = $${conditions.length + 1}`); params.push(where.id); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      return await query(sql, params);
    },
    create: async (data: any) => {
      const sql = `INSERT INTO projects (name, description, organizationId, createdAt, updatedAt) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`;
      const result = await query(sql, [data.name, data.description, data.organizationId]);
      return result[0];
    },
    update: async (where: any, data: any) => {
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      const allowedFields = ['name', 'description', 'isActive'];
      for (const key of allowedFields) {
        if (data[key] !== undefined) {
          setClauses.push(`${key} = $${paramIndex++}`);
          params.push(data[key]);
        }
      }
      
      const whereClauses: string[] = [];
      if (where.id) { whereClauses.push(`id = $${paramIndex++}`); params.push(where.id); }
      
      const sql = `UPDATE projects SET ${setClauses.join(', ')}, updatedAt = NOW() WHERE ${whereClauses.join(' AND ')} RETURNING *`;
      const result = await query(sql, params);
      return result[0];
    }
  },
  
  template: {
    findUnique: async (where: any) => {
      const sql = `SELECT * FROM templates WHERE id = $1 LIMIT 1`;
      return await queryOne(sql, [where.id]);
    },
    findMany: async (where?: any) => {
      let sql = 'SELECT * FROM templates';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.projectId) { conditions.push(`projectId = $${conditions.length + 1}`); params.push(where.projectId); }
        if (where.id) { conditions.push(`id = $${conditions.length + 1}`); params.push(where.id); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      return await query(sql, params);
    },
    findFirst: async (where?: any, options?: any) => {
      let sql = 'SELECT * FROM templates';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.projectId) { conditions.push(`projectId = $${conditions.length + 1}`); params.push(where.projectId); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      sql += ' ORDER BY createdAt DESC LIMIT 1';
      return await queryOne(sql, params);
    },
    create: async (data: any) => {
      const sql = `INSERT INTO templates (name, projectId, createdAt, updatedAt) VALUES ($1, $2, NOW(), NOW()) RETURNING *`;
      const result = await query(sql, [data.name, data.projectId]);
      return result[0];
    }
  },
  
  templateVersion: {
    findUnique: async (where: any) => {
      const sql = `SELECT * FROM template_versions WHERE id = $1 LIMIT 1`;
      return await queryOne(sql, [where.id]);
    },
    findFirst: async (where?: any, options?: any) => {
      let sql = 'SELECT * FROM template_versions';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.templateId) { conditions.push(`templateId = $${conditions.length + 1}`); params.push(where.templateId); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      sql += ' ORDER BY version DESC LIMIT 1';
      return await queryOne(sql, params);
    },
    findMany: async (where?: any) => {
      let sql = 'SELECT * FROM template_versions';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.templateId) { conditions.push(`templateId = $${conditions.length + 1}`); params.push(where.templateId); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      return await query(sql, params);
    },
    create: async (data: any) => {
      const sql = `INSERT INTO template_versions (templateId, version, elements, pdfUrl, createdAt, updatedAt) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`;
      const result = await query(sql, [data.templateId, data.version, JSON.stringify(data.elements), data.pdfUrl]);
      return result[0];
    }
  },
  
  templateElement: {
    findMany: async (where?: any) => {
      let sql = 'SELECT * FROM template_elements';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.templateVersionId) { conditions.push(`templateVersionId = $${conditions.length + 1}`); params.push(where.templateVersionId); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      return await query(sql, params);
    }
  },
  
  recipient: {
    findMany: async (where?: any) => {
      let sql = 'SELECT * FROM recipients';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.projectId) { conditions.push(`projectId = $${conditions.length + 1}`); params.push(where.projectId); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      return await query(sql, params);
    },
    create: async (data: any) => {
      const sql = `INSERT INTO recipients (name, email, projectId, metadata, createdAt) VALUES ($1, $2, $3, $4, NOW()) RETURNING *`;
      const result = await query(sql, [data.name, data.email, data.projectId, JSON.stringify(data.metadata || {})]);
      return result[0];
    },
    bulkCreate: async (data: any[]) => {
      const results = [];
      for (const recipient of data) {
        const result = await this.create(recipient);
        results.push(result);
      }
      return results;
    }
  },
  
  certificate: {
    findUnique: async (where: any) => {
      let sql = 'SELECT * FROM certificates';
      const params: any[] = [];
      const conditions: string[] = [];
      if (where.id) { conditions.push(`id = $${conditions.length + 1}`); params.push(where.id); }
      if (where.certificateNumber) { conditions.push(`certificateNumber = $${conditions.length + 1}`); params.push(where.certificateNumber); }
      if (where.verificationToken) { conditions.push(`verificationToken = $${conditions.length + 1}`); params.push(where.verificationToken); }
      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' LIMIT 1';
      return await queryOne(sql, params);
    },
    findMany: async (where?: any, options?: any) => {
      let sql = 'SELECT * FROM certificates';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.projectId) { conditions.push(`projectId = $${conditions.length + 1}`); params.push(where.projectId); }
        if (where.recipientId) { conditions.push(`recipientId = $${conditions.length + 1}`); params.push(where.recipientId); }
        if (where.status) { conditions.push(`status = $${conditions.length + 1}`); params.push(where.status); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      sql += ' ORDER BY createdAt DESC';
      if (options?.skip) sql += ` OFFSET ${options.skip}`;
      if (options?.take) sql += ` LIMIT ${options.take}`;
      return await query(sql, params);
    },
    count: async (where?: any) => {
      let sql = 'SELECT COUNT(*) as count FROM certificates';
      const params: any[] = [];
      if (where) {
        const conditions: string[] = [];
        if (where.projectId) { conditions.push(`projectId = $${conditions.length + 1}`); params.push(where.projectId); }
        if (where.status) { conditions.push(`status = $${conditions.length + 1}`); params.push(where.status); }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
      }
      const result = await queryOne(sql, params);
      return result ? parseInt(result.count, 10) : 0;
    },
    create: async (data: any) => {
      const sql = `INSERT INTO certificates (projectId, recipientId, templateVersionId, certificateNumber, verificationToken, status, metadata, issuedAt, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`;
      const result = await query(sql, [
        data.projectId,
        data.recipientId,
        data.templateVersionId,
        data.certificateNumber,
        data.verificationToken,
        data.status || 'GENERATED',
        JSON.stringify(data.metadata || {}),
        data.issuedAt
      ]);
      return result[0];
    },
    update: async (where: any, data: any) => {
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      const allowedFields = ['status', 'metadata', 'revokedAt', 'revocationReason'];
      for (const key of allowedFields) {
        if (data[key] !== undefined) {
          setClauses.push(`${key} = $${paramIndex++}`);
          params.push(data[key]);
        }
      }
      
      const whereClauses: string[] = [];
      if (where.id) { whereClauses.push(`id = $${paramIndex++}`); params.push(where.id); }
      if (where.certificateNumber) { whereClauses.push(`certificateNumber = $${paramIndex++}`); params.push(where.certificateNumber); }
      
      const sql = `UPDATE certificates SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')} RETURNING *`;
      const result = await query(sql, params);
      return result[0];
    }
  },
  
  generationJob: {
    findUnique: async (where: any) => {
      const sql = `SELECT * FROM generation_jobs WHERE id = $1 LIMIT 1`;
      return await queryOne(sql, [where.id]);
    },
    findMany: async (where?: any) => {
      let sql = 'SELECT * FROM generation_jobs';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.projectId) { conditions.push(`projectId = $${conditions.length + 1}`); params.push(where.projectId); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      return await query(sql, params);
    },
    create: async (data: any) => {
      const sql = `INSERT INTO generation_jobs (projectId, status, total, completed, failed, createdAt) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`;
      const result = await query(sql, [data.projectId, data.status, data.total, data.completed, data.failed]);
      return result[0];
    },
    update: async (where: any, data: any) => {
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      const allowedFields = ['status', 'total', 'completed', 'failed', 'completedAt'];
      for (const key of allowedFields) {
        if (data[key] !== undefined) {
          setClauses.push(`${key} = $${paramIndex++}`);
          params.push(data[key]);
        }
      }
      
      const whereClauses: string[] = [];
      if (where.id) { whereClauses.push(`id = $${paramIndex++}`); params.push(where.id); }
      
      const sql = `UPDATE generation_jobs SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')} RETURNING *`;
      const result = await query(sql, params);
      return result[0];
    }
  },
  
  certificateSequence: {
    findUnique: async (where: any) => {
      const sql = `SELECT * FROM certificate_sequences WHERE projectId = $1 LIMIT 1`;
      return await queryOne(sql, [where.projectId]);
    },
    create: async (data: any) => {
      const sql = `INSERT INTO certificate_sequences (projectId, nextNumber, createdAt) VALUES ($1, $2, NOW()) RETURNING *`;
      const result = await query(sql, [data.projectId, data.nextNumber]);
      return result[0];
    },
    update: async (where: any, data: any) => {
      const sql = `UPDATE certificate_sequences SET nextNumber = $1 WHERE projectId = $2 RETURNING *`;
      const result = await query(sql, [data.nextNumber, where.projectId]);
      return result[0];
    }
  },
  
  auditLog: {
    findMany: async (where?: any) => {
      let sql = 'SELECT * FROM audit_logs';
      const params: any[] = [];
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.userId) { conditions.push(`userId = $${conditions.length + 1}`); params.push(where.userId); }
        if (where.organizationId) { conditions.push(`organizationId = $${conditions.length + 1}`); params.push(where.organizationId); }
        if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
      }
      sql += whereClause;
      sql += ' ORDER BY createdAt DESC LIMIT 100';
      return await query(sql, params);
    },
    create: async (data: any) => {
      const sql = `INSERT INTO audit_logs (userId, organizationId, action, entityType, entityId, metadata, createdAt) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`;
      const result = await query(sql, [
        data.userId,
        data.organizationId,
        data.action,
        data.entityType,
        data.entityId,
        JSON.stringify(data.metadata || {})
      ]);
      return result[0];
    }
  }
};

// Export both styles for compatibility
export { connect, disconnect, query, queryOne, execute, client };
export { db };
export const prisma = db;
