// Open Studio Verify API (No Auth Required)
import { NextResponse } from 'next/server';
import { openStudioDB } from '@certiforge/open-studio';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ certificateNumber: string }> }
) {
  try {
    const { certificateNumber } = await params;

    if (!certificateNumber) {
      return NextResponse.json({ error: 'Certificate number required' }, { status: 400 });
    }

    const certificate = await openStudioDB.getCertificateByNumber(certificateNumber);

    if (!certificate) {
      return NextResponse.json({ verified: false, error: 'Certificate not found' }, { status: 404 });
    }

    // Get recipient and project details
    const recipient = await openStudioDB.getRecipient(certificate.recipientId);

    return NextResponse.json({
      verified: true,
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        status: certificate.status,
        recipient: recipient ? {
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
        } : null,
        project: {
          id: certificate.projectId,
          name: 'Open Studio Project',
        },
        templateVersion: {
          width: 842,
          height: 595,
          backgroundColor: '#ffffff',
          orientation: 'landscape',
        },
        issuedAt: certificate.issuedAt ? new Date(certificate.issuedAt).toISOString() : null,
        revokedAt: certificate.status === 'REVOKED' ? new Date().toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 500 });
  }
}
