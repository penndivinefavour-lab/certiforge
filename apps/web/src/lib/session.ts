// Session helpers - moved to separate file to avoid Next.js type conflicts
export async function getSession(token: string) {
  const { queryOne } = await import('@/lib/db');
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
    id: session.userId,
    email: session.email,
    name: session.name,
    avatarUrl: session.avatarUrl,
  };
}
