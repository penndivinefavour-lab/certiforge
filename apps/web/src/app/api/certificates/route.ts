import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";
import { claimCertificateNumber } from "@/lib/certificates";
import { NextRequest, NextResponse } from "next/server";

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
}

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

    await requirePermission(user.id, project.organizationId, "VIEWER");

    const { page = "1", pageSize = "20", search, status } = Object.fromEntries(request.nextUrl.searchParams.entries());

    const where: any = { projectId };
    if (status && status !== "all") {
      where.status = status;
    }
    if (search) {
      where.recipient = { name: { contains: search } };
    }

    const pageNum = parseInt(page, 10);
    const size = parseInt(pageSize, 10);
    const skip = (pageNum - 1) * size;

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        include: {
          recipient: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: size,
      }),
      prisma.certificate.count({ where }),
    ]);

    return NextResponse.json({
      certificates: certificates.map((c) => ({
        id: c.id,
        certificateNumber: c.certificateNumber,
        status: c.status,
        issuedAt: c.issuedAt,
        revokedAt: c.revokedAt,
        pdfUrl: c.pdfUrl,
        recipient: c.recipient,
        project: c.project,
      })),
      total,
      page: pageNum,
      pageSize: size,
      hasMore: pageNum * size < total,
    });
  } catch (error: any) {
    if (error.message === "You do not have access to this organization") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Certificates list error:", error);
    return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 });
  }
}
