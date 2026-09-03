import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";

const UpdateVersionSchema = z.object({
  versionId: z.string(),
  name: z.string().max(100).optional(),
  width: z.number().min(100).max(5000).optional(),
  height: z.number().min(100).max(5000).optional(),
  backgroundColor: z.string().optional(),
  orientation: z.enum(["PORTRAIT", "LANDSCAPE"]).optional(),
  elements: z.array(z.any()).optional(),
});

export async function PUT(request: NextRequest) {
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
    const parsed = UpdateVersionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors.map((e) => e.message).join(", ") }, { status: 400 });
    }

    const { versionId, name, width, height, backgroundColor, orientation, elements } = parsed.data;

    // Get version and verify permissions
    const version = await prisma.templateVersion.findUnique({
      where: { id: versionId },
      include: { template: { include: { project: true } } },
    });

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    await requirePermission(user.id, version.template.project.organizationId, "EDITOR");

    // Update version
    const updated = await prisma.templateVersion.update({
      where: { id: versionId },
      data: {
        name,
        width,
        height,
        backgroundColor,
        orientation,
        elements: elements !== undefined ? JSON.stringify(elements) : undefined,
      },
      include: { elements: { orderBy: { zIndex: "asc" } } },
    });

    // Update elements if provided
    if (elements) {
      // Delete existing elements
      await prisma.templateElement.deleteMany({ where: { versionId } });

      // Create new elements
      for (const elem of elements) {
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

    return NextResponse.json({
      version: {
        id: updated.id,
        version: updated.version,
        name: updated.name,
        width: updated.width,
        height: updated.height,
        backgroundColor: updated.backgroundColor,
        orientation: updated.orientation,
        elements: JSON.parse(updated.elements),
      },
    });
  } catch (error: any) {
    if (error.message === "You do not have permission to perform this action") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    console.error("Update version error:", error);
    return NextResponse.json({ error: "Failed to update version" }, { status: 500 });
  }
}
