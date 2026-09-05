// CertiForge Auth (self-contained with raw pg)
import bcrypt from 'bcryptjs';
import { queryOne, query, execute } from './db';
import * as crypto from 'crypto';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(input: { email: string; password: string; name: string }): Promise<{ id: string; email: string; name: string }> {
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [input.email.toLowerCase().trim()]);
  if (existing) {
    throw new Error('User with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const userId = crypto.randomUUID();

  await execute(
    'INSERT INTO users (id, email, name, password, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
    [userId, input.email.toLowerCase().trim(), input.name.trim(), passwordHash]
  );

  return { id: userId, email: input.email.toLowerCase().trim(), name: input.name.trim() };
}

export async function authenticateUser(email: string, password: string): Promise<{ id: string; email: string; name: string } | null> {
  const user = await queryOne('SELECT id, email, name, password FROM users WHERE email = $1', [email.toLowerCase()]);
  if (!user) return null;

  const valid = await verifyPassword(password, user.password);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name };
}

export async function createSession(userId: string, expiresInDays: number = 7): Promise<string> {
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const token = crypto.randomUUID() + '.' + Date.now().toString(36);

  await execute(
    'INSERT INTO sessions (id, "userId", token, "expiresAt", "createdAt") VALUES ($1, $2, $3, $4, NOW())',
    [crypto.randomUUID(), userId, token, expiresAt]
  );

  return token;
}

export async function getSession(token: string): Promise<any | null> {
  if (!token) return null;

  const session = await queryOne(
    `SELECT s.id, s."userId", s.token, s."expiresAt",
            u.id as "userId", u.email, u.name, u."avatarUrl"
     FROM "sessions" s
     JOIN "users" u ON s."userId" = u.id
     WHERE s.token = $1 AND s."expiresAt" > NOW()`,
    [token]
  );

  return session;
}

export async function deleteSession(token: string): Promise<void> {
  await execute('DELETE FROM sessions WHERE token = $1', [token]).catch(() => {});
}

export async function getUserFromSession(session: any): Promise<{ id: string; email: string; name: string; avatarUrl?: string } | null> {
  if (!session) return null;
  return {
    id: session.id,
    email: session.email,
    name: session.name,
    avatarUrl: session.avatarUrl,
  };
}

export function generateVerificationToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 32);
}

export async function requirePermission(userId: string, organizationId: string, requiredRole: string): Promise<void> {
  const member = await queryOne(
    'SELECT role FROM memberships WHERE userId = $1 AND organizationId = $2',
    [userId, organizationId]
  );

  if (!member) {
    throw new Error('You do not have access to this organization');
  }

  const roleOrder = { 'OWNER': 4, 'ADMIN': 3, 'EDITOR': 2, 'VIEWER': 1 };
  if ((roleOrder[member.role as keyof typeof roleOrder] || 0) < (roleOrder[requiredRole as keyof typeof roleOrder] || 0)) {
    throw new Error('You do not have permission to perform this action');
  }
}
