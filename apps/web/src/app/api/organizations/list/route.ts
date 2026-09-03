import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const user = await getUserFromSession(session);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Get user's organizations with project counts
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            _count: {
              select: { projects: true, recipients: true },
            },
          },
        },
      },
      orderBy: { organization: { updatedAt: "desc" } },
    });

    const organizations = memberships.map((m: any) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logoUrl: m.organization.logoUrl,
      primaryColor: m.organization.primaryColor,
      role: m.role,
      memberSince: m.createdAt,
      projectCount: m.organization._count.projects,
      recipientCount: m.organization._count.recipients,
    }));

    return new Response(JSON.stringify({ organizations }));
  } catch (error) {
    console.error("List organizations error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch organizations" }), { status: 500 });
  }
}