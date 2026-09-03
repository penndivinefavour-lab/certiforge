import { prisma } from "@/lib/db";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error("Organization members error:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
