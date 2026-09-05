// Open Studio API Routes (No Authentication Required)
import { NextRequest, NextResponse } from 'next/server';
import { openStudioDB } from '../../../packages/open-studio/src/db';

// Workspace
export async function GET(request: NextRequest) {
  try {
    const workspace = await openStudioDB.getOrCreateWorkspace();
    const projects = await openStudioDB.getProjects(workspace.id);
    
    return NextResponse.json({
      workspace,
      projects,
      projectCount: projects.length,
    });
  } catch (error) {
    console.error('Open Studio workspace error:', error);
    return NextResponse.json({ error: 'Failed to get workspace' }, { status: 500 });
  }
}
