import { z } from "zod";
import type {
  Organization,
  Project,
  Template,
  TemplateVersion,
  TemplateElement,
  Recipient,
  RecipientImport,
  RecipientImportRow,
  RecipientMapping,
  Certificate,
  GenerationJob,
  GenerationJobItem,
  CertificateEvent,
  AuditLog,
  Asset,
  CertificateSequence,
} from "../../packages/types/src/index.ts";
import { prisma } from "./client";
import { requirePermission } from "./auth";

// ============================================================================
// ORGANIZATIONS
// ============================================================================

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
): Promise<Organization> {
  const org = await prisma.organization.create({
    data: {
      name: data.name,
      slug: data.slug,
      primaryColor: data.primaryColor || "#1a1a2e",
      logoUrl: data.logoUrl || null,
    },
  });

  // Create OWNER membership
  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId,
      role: "OWNER",
    },
  });

  return org;
}

export async function getOrganization(id: string): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { id } });
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { slug } });
}

export async function updateOrganization(
  orgId: string,
  userId: string,
  data: { name?: string; slug?: string; primaryColor?: string; logoUrl?: string | null }
): Promise<Organization> {
  await requirePermission(userId, orgId, "OWNER");

  if (data.slug) {
    const existing = await prisma.organization.findFirst({
      where: { slug: data.slug, id: { not: orgId } },
    });
    if (existing) {
      throw new Error("Slug already in use");
    }
  }

  return prisma.organization.update({
    where: { id: orgId },
    data,
  });
}

// ============================================================================
// ORGANIZATION MEMBERS
// ============================================================================

const InviteMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

export async function addMember(orgId: string, userId: string, inviterId: string, role: "ADMIN" | "EDITOR" | "VIEWER") {
  await requirePermission(inviterId, orgId, "ADMIN");

  const existing = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
  });

  if (existing) {
    throw new Error("User is already a member");
  }

  const member = await prisma.organizationMember.create({
    data: {
      organizationId: orgId,
      userId,
      role,
    },
  });

  return member;
}

export async function removeMember(orgId: string, userId: string, removerId: string) {
  await requirePermission(removerId, orgId, "ADMIN");

  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId: orgId, userId },
    },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  if (member.role === "OWNER") {
    throw new Error("Cannot remove the organization owner");
  }

  await prisma.organizationMember.delete({
    where: { id: member.id },
  });
}

export async function updateMemberRole(
  orgId: string,
  userId: string,
  newRole: "ADMIN" | "EDITOR" | "VIEWER",
  updaterId: string
) {
  await requirePermission(updaterId, orgId, "ADMIN");

  return prisma.organizationMember.update({
    where: {
      organizationId_userId: { organizationId: orgId, userId },
    },
    data: { role: newRole },
  });
}

export async function getOrganizationMembers(orgId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: {
      user: {
        select: { id: true, email: true, name: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

// ============================================================================
// PROJECTS
// ============================================================================

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
): Promise<Project> {
  await requirePermission(userId, input.organizationId, "EDITOR");

  const existing = await prisma.project.findFirst({
    where: { organizationId: input.organizationId, slug: input.slug },
  });
  if (existing) {
    throw new Error("Project slug already in use");
  }

  const project = await prisma.project.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      slug: input.slug,
      description: input.description || null,
    },
  });

  // Create initial certificate sequence for current year
  const year = new Date().getFullYear();
  await prisma.certificateSequence.create({
    data: {
      projectId: project.id,
      year,
      nextNumber: 1,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: userId,
      action: "PROJECT_CREATED",
      resourceType: "project",
      resourceId: project.id,
      details: JSON.stringify({ name: project.name, slug: project.slug }),
    },
  });

  return project;
}

export async function getProject(id: string): Promise<Project | null> {
  return prisma.project.findUnique({
    where: { id },
    include: {
      organization: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
}

export async function getProjectBySlug(orgId: string, slug: string): Promise<Project | null> {
  return prisma.project.findUnique({
    where: { organizationId_slug: { organizationId: orgId, slug } },
  });
}

export async function listProjects(orgId: string, page = 1, pageSize = 20) {
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: orgId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { certificates: true, recipients: true, templates: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.project.count({ where: { organizationId: orgId } }),
  ]);

  return {
    data: projects,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: { name?: string; slug?: string; state?: "DRAFT" | "ACTIVE" | "ARCHIVED"; description?: string | null }
): Promise<Project> {
  await requirePermission(userId, projectId, "EDITOR");

  // Get the project to find orgId
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  await requirePermission(userId, project.organizationId, "EDITOR");

  if (data.slug) {
    const existing = await prisma.project.findFirst({
      where: { organizationId: project.organizationId, slug: data.slug, id: { not: projectId } },
    });
    if (existing) {
      throw new Error("Project slug already in use");
    }
  }

  return prisma.project.update({
    where: { id: projectId },
    data,
  });
}

export async function deleteProject(projectId: string, userId: string) {
  await requirePermission(userId, projectId, "OWNER");

  await prisma.project.delete({ where: { id: projectId } });
}

// ============================================================================
// TEMPLATES
// ============================================================================

const CreateTemplateSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  format: z.enum(["PDF", "PNG", "JPG", "WEBP"]).default("PDF"),
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;

export async function createTemplate(
  userId: string,
  input: CreateTemplateInput
): Promise<Template> {
  await requirePermission(userId, input.projectId, "EDITOR");

  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw new Error("Project not found");

  return prisma.template.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      description: input.description || null,
      format: input.format,
      status: "DRAFT",
    },
  });
}

export async function getTemplate(id: string): Promise<Template | null> {
  return prisma.template.findUnique({
    where: { id },
    include: {
      project: true,
      _count: { select: { versions: true, elements: true } },
    },
  });
}

export async function updateTemplate(
  templateId: string,
  userId: string,
  data: { name?: string; description?: string | null; status?: "DRAFT" | "PUBLISHED" }
): Promise<Template> {
  await requirePermission(userId, templateId, "EDITOR");

  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("Template not found");

  const project = await prisma.project.findUnique({ where: { id: template.projectId } });
  if (!project) throw new Error("Project not found");
  await requirePermission(userId, project.organizationId, "EDITOR");

  return prisma.template.update({
    where: { id: templateId },
    data,
  });
}

export async function deleteTemplate(templateId: string, userId: string) {
  await requirePermission(userId, templateId, "EDITOR");

  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("Template not found");

  const project = await prisma.project.findUnique({ where: { id: template.projectId } });
  if (!project) throw new Error("Project not found");
  await requirePermission(userId, project.organizationId, "EDITOR");

  await prisma.template.delete({ where: { id: templateId } });
}

// ============================================================================
// TEMPLATE VERSIONS
// ============================================================================

const CreateVersionSchema = z.object({
  templateId: z.string(),
  name: z.string().max(100).optional(),
  width: z.number().min(100).max(5000),
  height: z.number().min(100).max(5000),
  backgroundColor: z.string().default("#ffffff"),
  orientation: z.enum(["PORTRAIT", "LANDSCAPE"]).default("PORTRAIT"),
  elements: z.array(z.any()).default([]),
  background: z.string().optional(),
});

export type CreateVersionInput = z.infer<typeof CreateVersionSchema>;

export async function createTemplateVersion(
  userId: string,
  templateId: string,
  input: CreateVersionInput
): Promise<TemplateVersion> {
  await requirePermission(userId, templateId, "EDITOR");

  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("Template not found");

  const project = await prisma.project.findUnique({ where: { id: template.projectId } });
  if (!project) throw new Error("Project not found");
  await requirePermission(userId, project.organizationId, "EDITOR");

  // Get the next version number
  const lastVersion = await prisma.templateVersion.findFirst({
    where: { templateId },
    orderBy: { version: "desc" },
  });
  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const version = await prisma.templateVersion.create({
    data: {
      templateId,
      version: nextVersion,
      name: input.name || `Version ${nextVersion}`,
      width: input.width,
      height: input.height,
      backgroundColor: input.backgroundColor,
      orientation: input.orientation,
      elements: JSON.stringify(input.elements),
      background: input.background || null,
    },
  });

  // Create template elements
  const elementsData = input.elements as Array<{
    id: string;
    type: string;
    name: string;
    zIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    visible: boolean;
    locked: boolean;
    data: Record<string, unknown>;
  }>;

  for (const elem of elementsData) {
    await prisma.templateElement.create({
      data: {
        templateId,
        versionId: version.id,
        type: elem.type as "TEXT" | "IMAGE" | "SHAPE" | "LINE" | "QR_CODE" | "SIGNATURE" | "SEAL",
        name: elem.name,
        zIndex: elem.zIndex,
        x: elem.x,
        y: elem.y,
        width: elem.width,
        height: elem.height,
        rotation: elem.rotation,
        opacity: elem.opacity,
        visible: elem.visible,
        locked: elem.locked,
        data: JSON.stringify(elem.data),
      },
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      organizationId: project.organizationId,
      actorId: userId,
      action: "TEMPLATE_VERSION_CREATED",
      resourceType: "template_version",
      resourceId: version.id,
      details: JSON.stringify({ templateId, version: nextVersion }),
    },
  });

  return version;
}

export async function getTemplateVersion(id: string): Promise<TemplateVersion | null> {
  return prisma.templateVersion.findUnique({
    where: { id },
    include: { elements: { orderBy: { zIndex: "asc" } } },
  });
}

export async function getTemplateVersions(templateId: string) {
  return prisma.templateVersion.findMany({
    where: { templateId },
    include: { elements: { orderBy: { zIndex: "asc" } } },
    orderBy: { version: "desc" },
  });
}

export async function updateTemplateVersion(
  versionId: string,
  userId: string,
  data: {
    name?: string;
    width?: number;
    height?: number;
    backgroundColor?: string;
    orientation?: "PORTRAIT" | "LANDSCAPE";
    elements?: Array<Record<string, unknown>>;
    background?: string | null;
  }
): Promise<TemplateVersion> {
  await requirePermission(userId, versionId, "EDITOR");

  const version = await prisma.templateVersion.findUnique({ where: { id: versionId } });
  if (!version) throw new Error("Template version not found");

  const template = await prisma.template.findUnique({ where: { id: version.templateId } });
  if (!template) throw new Error("Template not found");
  const project = await prisma.project.findUnique({ where: { id: template.projectId } });
  if (!project) throw new Error("Project not found");
  await requirePermission(userId, project.organizationId, "EDITOR");

  // Update template elements if provided
  if (data.elements) {
    // Delete existing elements and recreate
    await prisma.templateElement.deleteMany({ where: { versionId } });

    for (const elem of data.elements) {
      await prisma.templateElement.create({
        data: {
          templateId: version.templateId,
          versionId,
          type: elem.type as "TEXT" | "IMAGE" | "SHAPE" | "LINE" | "QR_CODE" | "SIGNATURE" | "SEAL",
          name: elem.name as string,
          zIndex: elem.zIndex as number,
          x: elem.x as number,
          y: elem.y as number,
          width: elem.width as number,
          height: elem.height as number,
          rotation: elem.rotation as number,
          opacity: elem.opacity as number,
          visible: elem.visible as boolean,
          locked: elem.locked as boolean,
          data: JSON.stringify(elem.data as Record<string, unknown>),
        },
      });
    }
  }

  const updated = await prisma.templateVersion.update({
    where: { id: versionId },
    data: {
      name: data.name,
      width: data.width,
      height: data.height,
      backgroundColor: data.backgroundColor,
      orientation: data.orientation,
      elements: data.elements ? JSON.stringify(data.elements) : undefined,
      background: data.background,
    },
    include: { elements: { orderBy: { zIndex: "asc" } } },
  });

  return updated;
}

export async function publishTemplateVersion(versionId: string, userId: string) {
  await requirePermission(userId, versionId, "EDITOR");

  const version = await prisma.templateVersion.findUnique({ where: { id: versionId } });
  if (!version) throw new Error("Template version not found");

  const template = await prisma.template.findUnique({ where: { id: version.templateId } });
  if (!template) throw new Error("Template not found");

  const project = await prisma.project.findUnique({ where: { id: template.projectId } });
  if (!project) throw new Error("Project not found");
  await requirePermission(userId, project.organizationId, "EDITOR");

  await prisma.template.update({
    where: { id: version.templateId },
    data: { status: "PUBLISHED" },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: project.organizationId,
      actorId: userId,
      action: "TEMPLATE_VERSION_PUBLISHED",
      resourceType: "template_version",
      resourceId: versionId,
      details: JSON.stringify({ templateId: version.templateId, version: version.version }),
    },
  });
}

// ============================================================================
// TEMPLATE ELEMENTS (standalone CRUD)
// ============================================================================

export async function addTemplateElement(
  versionId: string,
  userId: string,
  element: {
    type: "TEXT" | "IMAGE" | "SHAPE" | "LINE" | "QR_CODE" | "SIGNATURE" | "SEAL";
    name: string;
    zIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    visible: boolean;
    locked: boolean;
    data: Record<string, unknown>;
  }
): Promise<TemplateElement> {
  await requirePermission(userId, versionId, "EDITOR");

  const version = await prisma.templateVersion.findUnique({ where: { id: versionId } });
  if (!version) throw new Error("Template version not found");

  const template = await prisma.template.findUnique({ where: { id: version.templateId } });
  if (!template) throw new Error("Template not found");
  const project = await prisma.project.findUnique({ where: { id: template.projectId } });
  if (!project) throw new Error("Project not found");
  await requirePermission(userId, project.organizationId, "EDITOR");

  return prisma.templateElement.create({
    data: {
      templateId: version.templateId,
      versionId,
      type: element.type,
      name: element.name,
      zIndex: element.zIndex,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      rotation: element.rotation,
      opacity: element.opacity,
      visible: element.visible,
      locked: element.locked,
      data: JSON.stringify(element.data),
    },
  });
}

export async function updateTemplateElement(
  elementId: string,
  userId: string,
  data: {
    name?: string;
    zIndex?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    opacity?: number;
    visible?: boolean;
    locked?: boolean;
    data?: Record<string, unknown>;
  }
): Promise<TemplateElement> {
  await requirePermission(userId, elementId, "EDITOR");

  const element = await prisma.templateElement.findUnique({ where: { id: elementId } });
  if (!element) throw new Error("Element not found");

  const template = await prisma.template.findUnique({ where: { id: element.templateId } });
  if (!template) throw new Error("Template not found");
  const project = await prisma.project.findUnique({ where: { id: template.projectId } });
  if (!project) throw new Error("Project not found");
  await requirePermission(userId, project.organizationId, "EDITOR");

  return prisma.templateElement.update({
    where: { id: elementId },
    data: {
      name: data.name,
      zIndex: data.zIndex,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      rotation: data.rotation,
      opacity: data.opacity,
      visible: data.visible,
      locked: data.locked,
      data: data.data ? JSON.stringify(data.data) : undefined,
    },
  });
}

export async function deleteTemplateElement(elementId: string, userId: string) {
  await requirePermission(userId, elementId, "EDITOR");

  const element = await prisma.templateElement.findUnique({ where: { id: elementId } });
  if (!element) throw new Error("Element not found");

  const template = await prisma.template.findUnique({ where: { id: element.templateId } });
  if (!template) throw new Error("Template not found");
  const project = await prisma.project.findUnique({ where: { id: template.projectId } });
  if (!project) throw new Error("Project not found");
  await requirePermission(userId, project.organizationId, "EDITOR");

  await prisma.templateElement.delete({ where: { id: elementId } });
}
