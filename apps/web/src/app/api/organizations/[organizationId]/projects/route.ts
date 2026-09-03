import { prisma } from "@/lib/db";
import { getSession, getUserFromSession, requirePermission } from "@/lib/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";

const OrgProjectSchema = z.object({
  organizationId: z.string(),
  projectId: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session")?.value;

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const user = await getUserFromSession(session);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Get organizationId from URL path
    const urlParts = request.nextUrl.pathname.split("/");
    const organizationId = urlParts[urlParts.indexOf("organizations") + 1];

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "Organization ID required" }), { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), { status: 404 });
    }

    const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(request.nextUrl.searchParams.get("pageSize") || "20", 10);
    const search = request.nextUrl.searchParams.get("search") || "";
    const skip = (page - 1) * pageSize;

    const where: any = { organizationId };
    if (search) {
      where.name = { contains: search };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { certificates: true, recipients: true, templates: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.project.count({ where }),
    ]);

    return new Response(JSON.stringify({
      projects: projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        state: p.state,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        stats: {
          certificates: p._count.certificates,
          recipients: p._count.recipients,
          templates: p._count.templates,
        },
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    }));
  } catch (error) {
    console.error("Organization projects error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch projects" }), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session")?.value;

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const user = await getUserFromSession(session);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Get organizationId from URL path
    const urlParts = request.nextUrl.pathname.split("/");
    const organizationId = urlParts[urlParts.indexOf("organizations") + 1];

    const body = await request.json() as { name?: string; slug?: string; description?: string };
    const { name, slug, description } = body || {};

    if (!name || !slug) {
      return new Response(JSON.stringify({ error: "Name and slug are required" }), { status: 400 });
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return new Response(JSON.stringify({ error: "Slug must contain only lowercase letters, numbers, and hyphens" }), { status: 400 });
    }

    // Verify permission
    await requirePermission(user.id, organizationId, "ADMIN");

    const existing = await prisma.project.findFirst({
      where: { organizationId: organizationId, slug },
    });
    if (existing) {
      return new Response(JSON.stringify({ error: "Project slug already in use" }), { status: 409 });
    }

    const project = await prisma.project.create({
      data: {
        organizationId: organizationId,
        name,
        slug,
        description: description || null,
        state: "DRAFT",
      },
    });

    // Create certificate sequence
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
        organizationId: organizationId,
        actorId: user.id,
        action: "PROJECT_CREATED",
        resourceType: "project",
        resourceId: project.id,
        details: JSON.stringify({ name, slug }),
      },
    });

    return new Response(JSON.stringify({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
      },
    }));
  } catch (error: any) {
    if (error.message?.includes("Permission")) {
      return new Response(JSON.stringify({ error: "Permission denied" }), { status: 403 });
    }
    console.error("Create project error:", error);
    return new Response(JSON.stringify({ error: "Failed to create project" }), { status: 500 });
  }
}