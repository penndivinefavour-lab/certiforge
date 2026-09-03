import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";

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
    const versionId = searchParams.get("versionId");
    const templateId = searchParams.get("templateId");

    if (versionId) {
      const version = await prisma.templateVersion.findUnique({
        where: { id: versionId },
        include: { elements: { orderBy: { zIndex: "asc" } } },
      });

      if (!version) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }

      return NextResponse.json({ version });
    }

    if (templateId) {
      const versions = await prisma.templateVersion.findMany({
        where: { templateId },
        include: { elements: { orderBy: { zIndex: "asc" } } },
        orderBy: { version: "desc" },
      });

      return NextResponse.json({ versions });
    }

    return NextResponse.json({ error: "Version ID or Template ID required" }, { status: 400 });
  } catch (error) {
    console.error("Get template versions error:", error);
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
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
    const parsed = CreateVersionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors.map((e) => e.message).join(", ") }, { status: 400 });
    }

    const { templateId, name, width, height, backgroundColor, orientation, elements, background } = parsed.data;

    // Verify template exists
    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Get next version number
    const lastVersion = await prisma.templateVersion.findFirst({
      where: { templateId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    const version = await prisma.templateVersion.create({
      data: {
        templateId,
        version: nextVersion,
        name: name || `Version ${nextVersion}`,
        width,
        height,
        backgroundColor,
        orientation,
        elements: JSON.stringify(elements),
        background: background || null,
      },
    });

    // Create template elements
    for (const elem of elements) {
      await prisma.templateElement.create({
        data: {
          templateId,
          versionId: version.id,
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

    return NextResponse.json({ version, elements: elements });
  } catch (error) {
    console.error("Create template version error:", error);
    return NextResponse.json({ error: "Failed to create version" }, { status: 500 });
  }
}
