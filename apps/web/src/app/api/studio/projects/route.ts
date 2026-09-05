// Open Studio Projects API
import { NextRequest, NextResponse } from 'next/server';
import { openStudioDB, getCurrentWorkspace } from '../../../../packages/open-studio/src/db';

export async function GET() {
  try {
    const workspace = await getCurrentWorkspace();
    const projects = await openStudioDB.getProjects(workspace.id);
    
    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }
    
    const workspace = await getCurrentWorkspace();
    const project = await openStudioDB.createProject({
      workspaceId: workspace.id,
      name,
      description: description || undefined,
      state: 'DRAFT',
    });
    
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
