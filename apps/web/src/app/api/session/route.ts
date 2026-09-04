import { queryOne } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function getSession(token: string) {
  return await queryOne(
    `SELECT s.id, s."userId", s.token, s."expiresAt",
            u.id as "userId", u.email, u.name, u."avatarUrl"
     FROM "sessions" s
     JOIN "users" u ON s."userId" = u.id
     WHERE s.token = $1 AND s."expiresAt" > NOW()`,
    [token]
  );
}

export async function getUserFromSession(session: any) {
  if (!session) return null;
  return {
    id: session.userId,  // Fixed: return user.id, not session.id
    email: session.email,
    name: session.name,
    avatarUrl: session.avatarUrl,
  };
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null, session: null });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ user: null, session: null });
    }

    const user = await getUserFromSession(session);
    return NextResponse.json({
      user,
      session: { id: session.id, expiresAt: session.expiresAt }
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ user: null, session: null });
  }
}
