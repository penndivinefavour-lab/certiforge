// Open Studio Generation API
// All actual work is done client-side via studioService
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return NextResponse.json({ certificates: [], count: 0 });
}

export async function POST(
  request: Request,
  _context: { params: Promise<{ projectId: string }> }
) {
  const body = await request.json();
  // Defer to client-side generation — return success placeholder
  // The actual PDF generation happens in the browser via studioService + certificate-engine
  return NextResponse.json({
    job: { id: crypto.randomUUID(), status: 'COMPLETED', total: 0, completed: 0, failed: 0 },
    certificates: [],
    errors: [],
    message: 'Generation must be performed client-side in Open Studio.',
  });
}
