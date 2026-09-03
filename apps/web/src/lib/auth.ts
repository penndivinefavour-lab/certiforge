// CertiForge Auth (self-contained)
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { SignJWT, jwtVerify } from "jose";

const SALT_ROUNDS = 12;

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

function jwtSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("User with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
      password: passwordHash,
      avatarUrl: null,
    },
  });
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;

  const valid = await verifyPassword(password, user.password);
  if (!valid) return null;

  return user;
}

export async function createSession(userId: string, expiresInDays = 7) {
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const token = crypto.randomUUID() + "." + Date.now().toString(36);

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return session.token;
}

export async function getSession(token: string) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session;
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } }).catch(() => {});
}

export async function getUserFromSession(session: any) {
  if (!session) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    avatarUrl: session.user.avatarUrl,
  };
}

// JWT helpers for API token auth
export interface TokenPayload {
  userId: string;
  type: "api_key";
}

export async function createApiToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(jwtSecret());
}

export async function verifyApiToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

// Verification token helper
export function generateVerificationToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
}

// Organization membership helpers
export type OrganizationMemberWithOrg = {
  id: string;
  role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

export async function getOrganizationMembership(
  userId: string,
  organizationId: string
): Promise<OrganizationMemberWithOrg | null> {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
    include: {
      organization: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!member) return null;

  return {
    id: member.id,
    role: member.role as "OWNER" | "ADMIN" | "EDITOR" | "VIEWER",
    organizationId: member.organizationId,
    organization: member.organization,
  };
}

export async function requirePermission(
  userId: string,
  organizationId: string,
  minimumRole: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER"
): Promise<OrganizationMemberWithOrg> {
  const member = await getOrganizationMembership(userId, organizationId);
  if (!member) {
    throw new Error("You do not have access to this organization");
  }

  const roleHierarchy: Record<string, number> = {
    OWNER: 4,
    ADMIN: 3,
    EDITOR: 2,
    VIEWER: 1,
  };

  if (roleHierarchy[member.role] < roleHierarchy[minimumRole]) {
    throw new Error("You do not have permission to perform this action");
  }

  return member;
}
