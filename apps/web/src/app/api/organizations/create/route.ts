import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { z } from "zod";
import type { NextRequest } from "next/server";

const CreateOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
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
    const parsed = CreateOrgSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors.map((e) => e.message).join(", ") }, { status: 400 });
    }

    const { name, slug } = parsed.data;

    // Check for existing org
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "Organization slug already in use" }, { status: 409 });
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        primaryColor: "#1a1a2e",
        logoUrl: null,
      },
    });

    // Create OWNER membership
    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    // Audit log
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

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        primaryColor: organization.primaryColor,
      },
    });
  } catch (error: any) {
    console.error("Create organization error:", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
