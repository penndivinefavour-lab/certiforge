import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserFromSession } from "@/lib/auth";
import { revokeCertificate } from "@/lib/certificates";

export async function GET(request: NextRequest) {
  try {
    const certificateNumber = request.nextUrl.searchParams.get("certificateNumber");

    if (!certificateNumber) {
      return NextResponse.json({ error: "Certificate number required" }, { status: 400 });
    }

    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        recipient: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        events: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!certificate) {
      return NextResponse.json({ certificate: null, error: "Certificate not found" }, { status: 404 });
    }

    return NextResponse.json({
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        status: certificate.status,
        issuedAt: certificate.issuedAt,
        revokedAt: certificate.revokedAt,
        revocationReason: certificate.revocationReason,
        recipient: certificate.recipient,
        project: certificate.project,
        events: certificate.events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          actorId: e.actorId,
          metadata: JSON.parse(e.metadata),
          createdAt: e.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Get certificate error:", error);
    return NextResponse.json({ error: "Failed to fetch certificate" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserFromSession(session);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const certificateNumber = request.nextUrl.searchParams.get("certificateNumber");
    if (!certificateNumber) {
      return NextResponse.json({ error: "Certificate number required" }, { status: 400 });
    }

    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber },
      include: { project: { select: { organizationId: true } } },
    });

    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: certificate.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = (await request.json()) as { reason?: string };
    const { reason } = body;

    if (!reason || typeof reason !== "string") {
      return NextResponse.json({ error: "Revocation reason is required" }, { status: 400 });
    }

    await revokeCertificate(certificate.id, user.id, reason);

    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        status: "REVOKED",
      },
    });
  } catch (error: any) {
    if (error.message === "Permission denied") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    console.error("Revoke certificate error:", error);
    return NextResponse.json({ error: "Failed to revoke certificate" }, { status: 500 });
  }
}
