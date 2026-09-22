// Open Studio Recipients API
// Returns data from IndexedDB (browser-only). SSR returns empty.
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  // IndexedDB is browser-only — return empty; the client will load via studioService
  return NextResponse.json({ recipients: [], count: 0 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await request.json();

  if (body.name) {
    return NextResponse.json({ recipient: { id: projectId, name: body.name, email: body.email, metadata: body.metadata || {} } });
  }

  if (Array.isArray(body.recipients)) {
    return NextResponse.json({ recipients: body.recipients, count: body.recipients.length });
  }

  return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
}
