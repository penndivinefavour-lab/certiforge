import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";

const CreateTemplateSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  format: z.enum(["PDF", "PNG", "JPG", "WEBP"]).default("PDF"),
  orientation: z.enum(["PORTRAIT", "LANDSCAPE"]).default("LANDSCAPE"),
  backgroundColor: z.string().default("#1a1a2e"),
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

    const { organizationId, name, description, format, orientation, backgroundColor } = parsed.data;

    // Find or create a project for this organization
    let project = await prisma.project.findFirst({
      where: { organizationId, state: "DRAFT" },
      orderBy: { createdAt: "asc" },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          organizationId,
          name: `${name} Project`,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: null,
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
    }

    const template = await prisma.template.create({
      data: {
        projectId: project.id,
        name,
        description: description || null,
        format,
        status: "DRAFT",
      },
    });

    // Create initial version
    await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        name: "Initial version",
        width: 800,
        height: 560,
        backgroundColor,
        orientation,
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
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
      },
    });
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
