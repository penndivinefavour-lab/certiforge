import { queryOne } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null });
    }

    const session = await queryOne(
      `SELECT s.id, s."userId", s.token, s."expiresAt",
              u.id as "userId", u.email, u.name, u."avatarUrl"
       FROM "sessions" s
       JOIN "users" u ON s."userId" = u.id
       WHERE s.token = $1 AND s."expiresAt" > NOW()`,
      [sessionToken]
    );

    const user = await getUserFromSession(session);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ user: null });
  }
}
