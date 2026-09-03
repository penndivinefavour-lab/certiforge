import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: {
        project: {
          select: { id: true, name: true, organizationId: true },
        },
        versions: {
          include: { elements: true },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const latestVersion = template.versions[0];

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        status: template.status,
        format: template.format,
        createdAt: template.createdAt,
        projectId: template.projectId,
      },
      latestVersion: latestVersion ? {
        id: latestVersion.id,
        version: latestVersion.version,
        name: latestVersion.name,
        width: latestVersion.width,
        height: latestVersion.height,
        backgroundColor: latestVersion.backgroundColor,
        orientation: latestVersion.orientation,
        elements: JSON.parse(latestVersion.elements),
        createdAt: latestVersion.createdAt,
      } : null,
    });
  } catch (error) {
    console.error("Get template error:", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}
