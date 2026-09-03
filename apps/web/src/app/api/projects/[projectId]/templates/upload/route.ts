import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";
import type { NextRequest } from "next/server";

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

    await requirePermission(user.id, project.organizationId, "EDITOR");

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    if (!file || !name) {
      return NextResponse.json({ error: "File and name are required" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only PNG, JPEG, or WebP images are supported" }, { status: 400 });
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be less than 10MB" }, { status: 400 });
    }

    // Create template
    const template = await prisma.template.create({
      data: {
        projectId,
        name,
        description: null,
        format: "PNG",
        status: "DRAFT",
      },
    });

    // Create version from uploaded image
    const version = await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        name: "Uploaded version",
        width: 800,
        height: 560,
        backgroundColor: "#ffffff",
        orientation: "LANDSCAPE",
        elements: JSON.stringify([]),
        background: URL.createObjectURL(file),
      },
    });

    // Create a text element with sample text
    await prisma.templateElement.create({
      data: {
        templateId: template.id,
        versionId: version.id,
        type: "TEXT",
        name: "Recipient Name",
        zIndex: 1,
        x: 200,
        y: 200,
        width: 400,
        height: 60,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        data: JSON.stringify({
          type: "TEXT",
          name: "Recipient Name",
          text: "{{recipient_name}}",
          fontSize: 32,
          fontFamily: "Georgia",
          fontWeight: "normal",
          color: "#1a1a2e",
          textAlign: "center",
          lineHeight: 1.2,
          letterSpacing: 0,
          dynamicField: "recipient_name",
          minFontSize: 16,
        }),
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
    console.error("Upload template error:", error);
    return NextResponse.json({ error: "Failed to upload template" }, { status: 500 });
  }
}
