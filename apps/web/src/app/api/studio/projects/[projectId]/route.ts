// Open Studio Project API - Client-side only, returns empty for SSR
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ project: null });
}

export async function PATCH() {
  return NextResponse.json({ error: 'Use client-side IndexedDB' }, { status: 400 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Use client-side IndexedDB' }, { status: 400 });
}
