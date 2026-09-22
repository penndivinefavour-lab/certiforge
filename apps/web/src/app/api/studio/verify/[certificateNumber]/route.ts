// Open Studio Verification API
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ certificateNumber: string }> }
) {
  // Verification is done client-side via IndexedDB
  return NextResponse.json({ 
    found: false, 
    message: 'Verification requires browser context' 
  });
}
