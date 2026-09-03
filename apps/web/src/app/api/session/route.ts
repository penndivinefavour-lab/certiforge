import { createSession, getSession, getUserFromSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null, session: null });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ user: null, session: null });
    }

    const user = await getUserFromSession(session);
    return NextResponse.json({ user, session: { id: session.id, expiresAt: session.expiresAt } });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ user: null, session: null });
  }
}
