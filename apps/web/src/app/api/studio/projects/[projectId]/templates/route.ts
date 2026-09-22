// Open Studio Templates API - Client-side only
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ templates: [] });
}

export async function POST() {
  return NextResponse.json({ error: 'Use client-side IndexedDB' }, { status: 400 });
}
