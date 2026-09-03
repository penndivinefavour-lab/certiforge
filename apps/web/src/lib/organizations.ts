// Organization and project operations (self-contained)
import { z } from "zod";
import { prisma } from "./db";
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
  const org = await prisma.organization.create({
    data: {
      name: data.name,
      slug: data.slug,
      primaryColor: data.primaryColor || "#1a1a2e",
      logoUrl: data.logoUrl || null,
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId,
      role: "OWNER",
    },
  });

  return org;
}

export async function getOrganization(id: string): Promise<any> {
  return prisma.organization.findUnique({ where: { id } });
}

export async function listOrganizations(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId },
    include: { organization: true },
  });
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

  const existing = await prisma.project.findFirst({
    where: { organizationId: input.organizationId, slug: input.slug },
  });
  if (existing) {
    throw new Error("Project slug already in use");
  }

  return prisma.project.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      slug: input.slug,
      description: input.description || null,
    },
  });
}

export async function getProject(id: string): Promise<any> {
  return prisma.project.findUnique({ where: { id } });
}

export async function listProjects(organizationId: string) {
  return prisma.project.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}
