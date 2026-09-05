// Open Studio Workspace API
import { NextResponse } from 'next/server';
import { openStudioDB } from 'open-studio';

// Workspace
export async function GET() {
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
