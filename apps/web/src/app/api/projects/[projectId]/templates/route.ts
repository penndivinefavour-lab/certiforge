import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";

const CreateTemplateSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  format: z.enum(["PDF", "PNG", "JPG", "WEBP"]).default("PDF"),
});

const UploadTemplateSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  file: z.instanceof(File),
});

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
    const parsed = CreateTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors.map((e) => e.message).join(", ") }, { status: 400 });
    }

    const { projectId, name, description, format } = parsed.data;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await requirePermission(user.id, project.organizationId, "EDITOR");

    // Check for existing template with same name
    const existing = await prisma.template.findFirst({
      where: { projectId, name },
    });
    if (existing) {
      return NextResponse.json({ error: "A template with this name already exists" }, { status: 409 });
    }

    const template = await prisma.template.create({
      data: {
        projectId,
        name,
        description: description || null,
        format,
        status: "DRAFT",
      },
    });

    // Create initial version (blank canvas)
    const version = await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        name: "Initial version",
        width: 800,
        height: 560,
        backgroundColor: "#1a1a2e",
        orientation: "LANDSCAPE",
        elements: JSON.stringify([]),
        background: null,
      },
    });

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        status: template.status,
        format: template.format,
      },
      version: {
        id: version.id,
        version: version.version,
        width: version.width,
        height: version.height,
        backgroundColor: version.backgroundColor,
        orientation: version.orientation,
      },
    });
  } catch (error: any) {
    if (error.message === "You do not have permission to perform this action") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    console.error("Create template error:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
