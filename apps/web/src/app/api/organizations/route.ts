import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
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

    const body = await request.json();
    const { organizationId, name, slug, description } = body;

    if (!organizationId || !name || !slug) {
      return NextResponse.json({ error: "Organization ID, name, and slug are required" }, { status: 400 });
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json({ error: "Slug must contain only lowercase letters, numbers, and hyphens" }, { status: 400 });
    }

    const existing = await prisma.organization.findFirst({
      where: { slug, id: { not: organizationId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        primaryColor: "#1a1a2e",
        logoUrl: null,
      },
    });

    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        actorId: user.id,
        action: "ORGANIZATION_CREATED",
        resourceType: "organization",
        resourceId: organization.id,
        details: JSON.stringify({ name, slug }),
      },
    });

    return NextResponse.json({ organization: { id: organization.id, name: organization.name, slug: organization.slug } });
  } catch (error: any) {
    console.error("Create organization error:", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
