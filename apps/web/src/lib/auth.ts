// CertiForge Auth (self-contained with raw pg)
const bcrypt = require('bcryptjs');
const { queryOne, query, execute } = require('@/lib/db');

const SALT_ROUNDS = 12;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

async function createUser(input) {
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [input.email.toLowerCase().trim()]);
  if (existing) {
    throw new Error('User with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const userId = require('crypto').randomUUID();

  await execute(
    'INSERT INTO users (id, email, name, password, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
    [userId, input.email.toLowerCase().trim(), input.name.trim(), passwordHash]
  );

  return { id: userId, email: input.email.toLowerCase().trim(), name: input.name.trim() };
}

async function authenticateUser(email, password) {
  const user = await queryOne('SELECT id, email, name, password FROM users WHERE email = $1', [email.toLowerCase()]);
  if (!user) return null;

  const valid = await verifyPassword(password, user.password);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name };
}

async function createSession(userId, expiresInDays = 7) {
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const token = require('crypto').randomUUID() + '.' + Date.now().toString(36);

  await execute(
    'INSERT INTO sessions (id, "userId", token, "expiresAt", "createdAt") VALUES ($1, $2, $3, $4, NOW())',
    [require('crypto').randomUUID(), userId, token, expiresAt]
  );

  return token;
}

async function getSession(token) {
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

async function deleteSession(token) {
  await execute('DELETE FROM sessions WHERE token = $1', [token]).catch(() => {});
}

async function getUserFromSession(session) {
  if (!session) return null;
  return {
    id: session.id,
    email: session.email,
    name: session.name,
    avatarUrl: session.avatarUrl,
  };
}

function generateVerificationToken() {
  return require('crypto').randomUUID().replace(/-/g, '').slice(0, 32);
}

module.exports = {
  hashPassword,
  verifyPassword,
  createUser,
  authenticateUser,
  createSession,
  getSession,
  deleteSession,
  getUserFromSession,
  generateVerificationToken,
};
