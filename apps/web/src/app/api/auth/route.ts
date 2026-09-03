// CertiForge - Main API Routes (App Router)
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserFromSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    const user = await getUserFromSession(session);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      include: {
        memberships: {
          include: { organization: true }
        }
      }
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as any;
    const { email, password, name } = body;
    
    // TODO: Implement registration logic
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Registration endpoint ready' });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}