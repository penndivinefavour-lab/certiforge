import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";

const TemplateSchema = z.object({
  organizationId: z.string(),
  templateId: z.string(),
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
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const templates = await prisma.template.findMany({
      where: {
        project: { organizationId },
      },
      include: {
        project: {
          select: { id: true, name: true, organizationId: true },
        },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        status: t.status,
        format: t.format,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        version: t.versions[0]?.version || 0,
        latestVersion: t.versions[0] ? {
          id: t.versions[0].id,
          version: t.versions[0].version,
          width: t.versions[0].width,
          height: t.versions[0].height,
          backgroundColor: t.versions[0].backgroundColor,
          orientation: t.versions[0].orientation,
        } : null,
        projectId: t.project.id,
        projectName: t.project.name,
      })),
    });
  } catch (error) {
    console.error("Organization templates error:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}
