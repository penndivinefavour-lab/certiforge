import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

    // Get version
    const version = await db.templateVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Update version
    const updated = await db.templateVersion.update({ id: versionId }, {
      name,
      width,
      height,
      backgroundColor,
      orientation,
      elements: elements !== undefined ? JSON.stringify(elements) : undefined,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update template version" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("id");

    if (!versionId) {
      return NextResponse.json({ error: "Missing version ID" }, { status: 400 });
    }

    // Get version
    const version = await db.templateVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    await db.templateVersion.delete({
      where: { id: versionId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete template version" }, { status: 500 });
  }
}
