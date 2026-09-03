import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import type { NextRequest } from "next/server";

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

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: { projects: true, members: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logoUrl: organization.logoUrl,
        primaryColor: organization.primaryColor,
        memberCount: organization._count.members,
        projectCount: organization._count.projects,
      },
    });
  } catch (error) {
    console.error("Get organization error:", error);
    return NextResponse.json({ error: "Failed to fetch organization" }, { status: 500 });
  }
}
