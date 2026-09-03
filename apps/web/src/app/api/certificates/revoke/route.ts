import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";
import { revokeCertificate } from "@/lib/certificates";
import { NextRequest, NextResponse } from "next/server";

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
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = (await request.json()) as { certificateId?: string; reason?: string };
    const { certificateId, reason } = body;

    if (!certificateId || !reason) {
      return NextResponse.json({ error: "Certificate ID and revocation reason are required" }, { status: 400 });
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        project: { select: { organizationId: true } },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    if (certificate.status === "REVOKED") {
      return NextResponse.json({ error: "Certificate is already revoked" }, { status: 400 });
    }

    await requirePermission(user.id, certificate.project.organizationId, "ADMIN");

    await revokeCertificate(certificateId, user.id, reason);

    return NextResponse.json({ success: true, certificateNumber: certificate.certificateNumber });
  } catch (error: any) {
    if (error.message === "You do not have permission to perform this action") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    console.error("Revoke error:", error);
    return NextResponse.json({ error: "Failed to revoke certificate" }, { status: 500 });
  }
}
