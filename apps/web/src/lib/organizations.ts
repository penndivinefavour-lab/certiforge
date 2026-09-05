// Organization and project operations (self-contained)
import { z } from "zod";
import { query, queryOne, execute } from "./db";
import { requirePermission } from "./auth";

export type Organization = any;
export type Project = any;

const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logoUrl: z.string().url().optional(),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export async function createOrganization(
  userId: string,
  data: CreateOrganizationInput
): Promise<any> {
  const result = await query(
    'INSERT INTO organizations (name, slug, primaryColor, logoUrl, createdAt, updatedAt) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
    [data.name, data.slug, data.primaryColor || '#1a1a2e', data.logoUrl || null]
  );
  const org = result[0];

  await query(
    'INSERT INTO organization_members (organizationId, userId, role, createdAt) VALUES ($1, $2, $3, NOW())',
    [org.id, userId, 'OWNER']
  );

  return org;
}

export async function getOrganization(id: string): Promise<any> {
  return await queryOne('SELECT * FROM organizations WHERE id = $1', [id]);
}

export async function listOrganizations(userId: string) {
  const members = await query(
    'SELECT om.*, o.* FROM organization_members om JOIN organizations o ON om.organizationId = o.id WHERE om.userId = $1',
    [userId]
  );
  return members;
}

const CreateProjectSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export async function createProject(
  userId: string,
  input: CreateProjectInput
): Promise<any> {
  await requirePermission(userId, input.organizationId, "EDITOR");

  const existing = await queryOne(
    'SELECT id FROM projects WHERE organizationId = $1 AND slug = $2 LIMIT 1',
    [input.organizationId, input.slug]
  );
  if (existing) {
    throw new Error("Project slug already in use");
  }

  const result = await query(
    'INSERT INTO projects (name, slug, description, organizationId, createdAt, updatedAt) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
    [input.name, input.slug, input.description || null, input.organizationId]
  );
  return result[0];
}

export async function getProject(id: string): Promise<any> {
  return await queryOne('SELECT * FROM projects WHERE id = $1', [id]);
}

export async function listProjects(organizationId: string) {
  return await query(
    'SELECT * FROM projects WHERE organizationId = $1 ORDER BY createdAt DESC',
    [organizationId]
  );
}

export async function findProject(slug: string): Promise<any> {
  return await queryOne('SELECT * FROM projects WHERE slug = $1', [slug]);
}
