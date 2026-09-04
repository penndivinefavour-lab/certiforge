// CertiForge Database Client - Organizations
import { query, queryOne, execute } from './client';

export async function getOrganizationBySlug(slug: string) {
  return await queryOne('SELECT * FROM organizations WHERE slug = $1', [slug]);
}

export async function createOrganization(data: {
  name: string;
  slug: string;
  primaryColor?: string;
  logoUrl?: string;
}, userId: string) {
  const id = require('crypto').randomUUID();
  
  await execute(
    'INSERT INTO organizations (id, name, slug, "primaryColor", "logoUrl", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
    [id, data.name, data.slug, data.primaryColor || '#1a1a2e', data.logoUrl || null]
  );
  
  await execute(
    'INSERT INTO organization_members (id, "userId", "organizationId", role, "createdAt") VALUES ($1, $2, $3, $4, NOW())',
    [require('crypto').randomUUID(), userId, id, 'OWNER']
  );
  
  return await queryOne('SELECT * FROM organizations WHERE id = $1', [id]);
}

export async function getOrganizationsByUserId(userId: string) {
  return await query(
    `SELECT o.*, om.role, om."createdAt" as memberSince
     FROM organizations o
     JOIN organization_members om ON o.id = om."organizationId"
     WHERE om."userId" = $1
     ORDER BY o."updatedAt" DESC`,
    [userId]
  );
}

export async function getOrganizationById(id: string) {
  return await queryOne('SELECT * FROM organizations WHERE id = $1', [id]);
}

export async function addOrganizationMember(organizationId: string, userId: string, role: string) {
  const exists = await queryOne(
    'SELECT id FROM organization_members WHERE "organizationId" = $1 AND "userId" = $2',
    [organizationId, userId]
  );
  
  if (exists) {
    return null;
  }
  
  await execute(
    'INSERT INTO organization_members (id, "organizationId", "userId", role, "createdAt") VALUES ($1, $2, $3, $4, NOW())',
    [require('crypto').randomUUID(), organizationId, userId, role]
  );
  
  return await queryOne(
    'SELECT * FROM organization_members WHERE "organizationId" = $1 AND "userId" = $2',
    [organizationId, userId]
  );
}

export async function removeOrganizationMember(organizationId: string, userId: string) {
  await execute(
    'DELETE FROM organization_members WHERE "organizationId" = $1 AND "userId" = $2',
    [organizationId, userId]
  );
}

export async function getOrganizationMembers(organizationId: string) {
  return await query(
    `SELECT om.*, u.email, u.name, u."avatarUrl"
     FROM organization_members om
     JOIN users u ON om."userId" = u.id
     WHERE om."organizationId" = $1`,
    [organizationId]
  );
}

export async function updateOrganization(
  id: string,
  data: { name?: string; slug?: string; primaryColor?: string; logoUrl?: string }
) {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (data.name) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.slug) {
    updates.push(`slug = $${paramIndex++}`);
    values.push(data.slug);
  }
  if (data.primaryColor) {
    updates.push(`"primaryColor" = $${paramIndex++}`);
    values.push(data.primaryColor);
  }
  if (data.logoUrl !== undefined) {
    updates.push(`"logoUrl" = $${paramIndex++}`);
    values.push(data.logoUrl);
  }
  
  if (updates.length === 0) {
    return await queryOne('SELECT * FROM organizations WHERE id = $1', [id]);
  }
  
  updates.push(`"updatedAt" = NOW()`);
  values.push(id);
  
  await execute(
    `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
  
  return await queryOne('SELECT * FROM organizations WHERE id = $1', [id]);
}
