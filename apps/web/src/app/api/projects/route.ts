import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";
import type { NextRequest } from "next/server";
import { z } from "zod";

const CreateProjectSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserFromSession(session);

    const { searchParams } = request.nextUrl;
    const orgId = searchParams.get("organizationId");

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    await requirePermission(user.id, orgId, "VIEWER");

    const { page = "1", pageSize = "20" } = searchParams;
    const pageNum = parseInt(page, 10);
    const size = parseInt(pageSize, 10);
    const skip = (pageNum - 1) * size;

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
        skip,
        take: size,
      }),
      prisma.project.count({ where: { organizationId: orgId } }),
    ]);

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        state: p.state,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        organizationId: p.organizationId,
        stats: {
          certificates: p._count.certificates,
          recipients: p._count.recipients,
          templates: p._count.templates,
        },
      })),
      total,
      page: pageNum,
      pageSize: size,
      hasMore: pageNum * size < total,
    });
  } catch (error: any) {
    if (error.message === "You do not have access to this organization") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Projects list error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserFromSession(session);

    const body = await request.json();
    const parsed = CreateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors.map((e) => e.message).join(", ") }, { status: 400 });
    }

    const { organizationId, name, slug, description } = parsed.data;

    await requirePermission(user.id, organizationId, "EDITOR");

    const existing = await prisma.project.findFirst({
      where: { organizationId, slug },
    });
    if (existing) {
      return NextResponse.json({ error: "Project slug already in use" }, { status: 409 });
    }

    const project = await prisma.project.create({
      data: {
        organizationId,
        name,
        slug,
        description: description || null,
        state: "DRAFT",
      },
    });

    // Create initial certificate sequence
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
        organizationId,
        actorId: user.id,
        action: "PROJECT_CREATED",
        resourceType: "project",
        resourceId: project.id,
        details: JSON.stringify({ name, slug }),
      },
    });

    revalidatePath("/dashboard");

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        state: project.state,
        description: project.description,
        organizationId: project.organizationId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error: any) {
    if (error.message === "You do not have permission to perform this action") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
