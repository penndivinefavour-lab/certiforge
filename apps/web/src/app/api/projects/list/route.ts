import { prisma } from "@/lib/db";
import { getSession, getUserFromSession } from "@/lib/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";

const CreateProjectSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
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

    const orgId = request.nextUrl.searchParams.get("organizationId");

    if (!orgId) {
      return new Response(JSON.stringify({ error: "Organization ID required" }), { status: 400 });
    }

    const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(request.nextUrl.searchParams.get("pageSize") || "20", 10);
    const search = request.nextUrl.searchParams.get("search") || "";
    const skip = (page - 1) * pageSize;

    const where: any = { organizationId: orgId };
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
    console.error("Projects list error:", error);
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

    const body = await request.json() as any;
    const { organizationId, name, slug, description } = body;

    if (!organizationId || !name || !slug) {
      return new Response(JSON.stringify({ error: "Organization ID, name and slug are required" }), { status: 400 });
    }

    const existing = await prisma.project.findFirst({
      where: { organizationId, slug },
    });
    if (existing) {
      return new Response(JSON.stringify({ error: "Project slug already in use" }), { status: 409 });
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

    // Create certificate sequence
    const year = new Date().getFullYear();
    await prisma.certificateSequence.create({
      data: {
        projectId: project.id,
        year,
        nextNumber: 1,
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
    console.error("Create project error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to create project" }), { status: 500 });
  }
}