// Open Studio Recipients API
import { NextRequest, NextResponse } from 'next/server';
import { openStudioDB } from '../../../../packages/open-studio/src/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create recipient' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
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
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    
    const { recipients } = body;
    
    if (!Array.isArray(recipients) || recipients.length === 0) {
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create recipients' }, { status: 500 });
  }
}
