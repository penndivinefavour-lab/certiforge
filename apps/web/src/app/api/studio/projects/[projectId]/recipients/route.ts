// Open Studio Recipients API
import { NextResponse } from 'next/server';
import { openStudioDB } from '@certiforge/open-studio';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const recipients = await openStudioDB.getRecipients(projectId);

    return NextResponse.json({ recipients, count: recipients.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    // Handle both single recipient and bulk import
    if (body.name) {
      // Single recipient
      const { name, email, metadata = {} } = body;

      if (!name) {
        return NextResponse.json({ error: 'Recipient name is required' }, { status: 400 });
      }

      const recipient = await openStudioDB.createRecipient({
        projectId,
        name,
        email: email || undefined,
        metadata,
      });

      return NextResponse.json({ recipient });
    }

    if (Array.isArray(body.recipients)) {
      // Bulk import
      const { recipients } = body;

      if (recipients.length === 0) {
        return NextResponse.json({ error: 'Recipients array is required' }, { status: 400 });
      }

      const created = await openStudioDB.bulkCreateRecipients(
        recipients.map(r => ({
          projectId,
          name: r.name,
          email: r.email,
          metadata: r.metadata || {},
        }))
      );

      return NextResponse.json({ recipients: created, count: created.length });
    }

    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  } catch (error) {
    console.error('Recipients error:', error);
    return NextResponse.json({ error: 'Failed to create recipients' }, { status: 500 });
  }
}
