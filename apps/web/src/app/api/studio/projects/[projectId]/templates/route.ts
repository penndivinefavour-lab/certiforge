// Open Studio Templates API
import { NextResponse } from 'next/server';
import { openStudioDB } from '@certiforge/open-studio';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    const { name, orientation = 'landscape', width = 842, height = 595, elements = [], backgroundColor } = body;

    if (!name) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    const template = await openStudioDB.createTemplate({
      projectId,
      name,
      orientation,
      width,
      height,
      elements,
      backgroundColor,
    });

    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const templates = await openStudioDB.getTemplates(projectId);

    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
