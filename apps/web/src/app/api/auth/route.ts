// CertiForge Auth API Routes
import { queryOne, query, execute } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const SESSION_EXPIRY_DAYS = 7;

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ user: null, session: null });
    }

    const session = await queryOne(
      `SELECT s.id, s."userId", s.token, s."expiresAt", 
              u.id as "userId", u.email, u.name, u."avatarUrl"
       FROM "sessions" s
       JOIN "users" u ON s."userId" = u.id
       WHERE s.token = $1 AND s."expiresAt" > NOW()`,
      [sessionToken]
    );

    if (!session) {
      return NextResponse.json({ user: null, session: null });
    }

    return NextResponse.json({
      user: {
        id: session.id,
        email: session.email,
        name: session.name,
        avatarUrl: session.avatarUrl,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ user: null, session: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as any;
    const { action, email, password, name } = body;

    if (action === 'signin') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      const user = await queryOne(
        'SELECT id, email, name, password FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );

      if (!user) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const token = randomUUID() + '.' + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      
      await execute(
        'INSERT INTO sessions (id, "userId", token, "expiresAt", "createdAt") VALUES ($1, $2, $3, $4, NOW())',
        [randomUUID(), user.id, token, expiresAt]
      );
      
      const response = NextResponse.json({ 
        token, 
        user: { id: user.id, email: user.email, name: user.name } 
      });
      response.cookies.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
        path: '/',
      });
      
      return response;
    }

    if (action === 'signup') {
      if (!email || !password || !name) {
        return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
      }

      const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (existing) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const userId = randomUUID();
      const token = randomUUID() + '.' + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      
      await execute(
        'INSERT INTO users (id, email, name, password, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [userId, email.toLowerCase().trim(), name.trim(), passwordHash]
      );
      
      await execute(
        'INSERT INTO sessions (id, "userId", token, "expiresAt", "createdAt") VALUES ($1, $2, $3, $4, NOW())',
        [randomUUID(), userId, token, expiresAt]
      );
      
      const response = NextResponse.json({ 
        token, 
        user: { id: userId, email: email.toLowerCase().trim(), name: name.trim() } 
      });
      response.cookies.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
        path: '/',
      });
      
      return response;
    }

    if (action === 'signout') {
      const sessionToken = request.cookies.get('session')?.value;
      if (sessionToken) {
        await execute('DELETE FROM sessions WHERE token = $1', [sessionToken]);
      }
      
      const response = NextResponse.json({ success: true });
      response.cookies.set('session', '', { maxAge: 0, path: '/' });
      return response;
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
