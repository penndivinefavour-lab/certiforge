import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";

const CreateRecipientSchema = z.object({
  projectId: z.string(),
  recipients: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().optional(),
      externalId: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
  ),
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
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await requirePermission(user.id, project.organizationId, "VIEWER");

    const { page = "1", pageSize = "20", search } = searchParams;
    const pageNum = parseInt(page, 10);
    const size = parseInt(pageSize, 10);
    const skip = (pageNum - 1) * size;

    const where: any = { projectId };
    if (search) {
      where.name = { contains: search };
    }

    const [recipients, total] = await Promise.all([
      prisma.recipient.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          externalId: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: size,
      }),
      prisma.recipient.count({ where }),
    ]);

    return NextResponse.json({
      recipients: recipients.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        externalId: r.externalId,
        createdAt: r.createdAt,
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
    console.error("Recipients list error:", error);
    return NextResponse.json({ error: "Failed to fetch recipients" }, { status: 500 });
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
    const parsed = CreateRecipientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors.map((e) => e.message).join(", ") }, { status: 400 });
    }

    const { projectId, recipients } = parsed.data;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await requirePermission(user.id, project.organizationId, "EDITOR");

    const created = await Promise.all(
      recipients.map((r) =>
        prisma.recipient.create({
          data: {
            organizationId: project.organizationId,
            projectId,
            name: r.name,
            email: r.email || null,
            externalId: r.externalId || null,
            metadata: r.metadata ? JSON.stringify(r.metadata) : "{}",
          },
        })
      )
    );

    return NextResponse.json({
      recipients: created.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        externalId: r.externalId,
      })),
      count: created.length,
    });
  } catch (error: any) {
    if (error.message === "You do not have permission to perform this action") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    console.error("Create recipients error:", error);
    return NextResponse.json({ error: "Failed to create recipients" }, { status: 500 });
  }
}
