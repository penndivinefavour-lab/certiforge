import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const certificateNumber = searchParams.get("certificateNumber");

    if (!certificateNumber) {
      return NextResponse.json({ error: "Certificate number required" }, { status: 400 });
    }

    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        recipient: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, organizationId: true } },
        templateVersion: {
          select: {
            width: true,
            height: true,
            backgroundColor: true,
            orientation: true,
            elements: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json({ verified: false, error: "Certificate not found" }, { status: 404 });
    }

    return NextResponse.json({
      verified: true,
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        status: certificate.status,
        recipient: certificate.recipient,
        project: certificate.project,
        templateVersion: certificate.templateVersion,
        issuedAt: certificate.issuedAt,
        revokedAt: certificate.revokedAt,
      },
    });
  } catch (error) {
    console.error("Verify certificate error:", error);
    return NextResponse.json({ verified: false, error: "Verification failed" }, { status: 500 });
  }
}
