import { query, execute } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, getUserFromSession } from '@/lib/auth';

// GET /api/organizations - List user's organizations
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromSession(session);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await query(
      `SELECT om.id, om."userId", om.role, om."createdAt",
              o.id as "orgId", o.name, o.slug, o."logoUrl", o."primaryColor",
              (SELECT count(*) FROM projects p WHERE p."organizationId" = o.id) as "projectCount",
              (SELECT count(*) FROM recipients r WHERE r."organizationId" = o.id) as "recipientCount",
              (SELECT count(*) FROM certificates c WHERE c."projectId" IN (SELECT id FROM projects WHERE "organizationId" = o.id)) as "certificateCount"
       FROM "organization_members" om
       JOIN "organizations" o ON om."organizationId" = o.id
       WHERE om."userId" = $1
       ORDER BY o."updatedAt" DESC`,
      [user.id]
    );

    const organizations = memberships.map((m: any) => ({
      id: m.orgId,
      name: m.name,
      slug: m.slug,
      logoUrl: m.logoUrl,
      primaryColor: m.primaryColor,
      role: m.role,
      memberSince: m.createdAt,
      projectCount: m.projectCount || 0,
      certificateCount: m.certificateCount || 0,
      recipientCount: m.recipientCount || 0,
    }));

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('List organizations error:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

// POST /api/organizations - Create new organization
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromSession(session);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Organization name and slug are required' }, { status: 400 });
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' }, { status: 400 });
    }

    const existing = await query('SELECT id FROM organizations WHERE slug = $1', [slug]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
    }

    const orgId = require('crypto').randomUUID();
    const organizationId = orgId;

    await execute(
      'INSERT INTO organizations (id, name, slug, "primaryColor", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [organizationId, name, slug, '#1a1a2e']
    );

    await execute(
      'INSERT INTO organization_members (id, "userId", "organizationId", role, "createdAt") VALUES ($1, $2, $3, $4, NOW())',
      [require('crypto').randomUUID(), user.id, organizationId, 'OWNER']
    );

    return NextResponse.json({
      organization: { id: organizationId, name, slug }
    });
  } catch (error) {
    console.error('Create organization error:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
