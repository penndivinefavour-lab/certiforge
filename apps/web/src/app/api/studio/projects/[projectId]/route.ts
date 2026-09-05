// Open Studio Project API
import { NextRequest, NextResponse } from 'next/server';
import { openStudioDB } from '../../../../packages/open-studio/src/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const project = await openStudioDB.getProject(projectId);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const templates = await openStudioDB.getTemplates(projectId);
    const recipients = await openStudioDB.getRecipients(projectId);
    const certificates = await openStudioDB.getCertificates(projectId);
    
    return NextResponse.json({
      project,
      templates,
      recipientCount: recipients.length,
      certificateCount: certificates.length,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    
    const project = await openStudioDB.updateProject(projectId, body);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const deleted = await openStudioDB.deleteProject(projectId);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
