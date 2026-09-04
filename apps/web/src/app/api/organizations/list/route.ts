import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, getUserFromSession } from '@/lib/auth';

export async function GET() {
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

    // Get user's organizations with project counts
    const memberships = await query(
      `SELECT om.id, om."userId", om.role, om."createdAt",
              o.id as "orgId", o.name, o.slug, o."logoUrl", o."primaryColor",
              (SELECT count(*) FROM projects p WHERE p."organizationId" = o.id) as "projectCount",
              (SELECT count(*) FROM recipients r WHERE r."organizationId" = o.id) as "recipientCount",
              (SELECT count(*) FROM certificates c JOIN projects p ON c."projectId" = p.id WHERE p."organizationId" = o.id) as "certificateCount"
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
