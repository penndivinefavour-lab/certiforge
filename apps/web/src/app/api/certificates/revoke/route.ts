import { NextResponse } from 'next/server';

// Revoke a certificate by ID
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { certificateId } = body;

    if (!certificateId) {
      return NextResponse.json(
        { error: 'Certificate ID is required' },
        { status: 400 }
      );
    }

    // In production, this would update the database
    // For Open Studio (client-side only), we log the action
    console.log('[Certificates/Revoke] Revoking certificate:', certificateId);

    return NextResponse.json({ 
      success: true, 
      message: 'Certificate revocation logged (client-side mode)' 
    });
  } catch (error) {
    console.error('[Certificates/Revoke] Error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke certificate' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  // Alias for POST
  return POST(request);
}
