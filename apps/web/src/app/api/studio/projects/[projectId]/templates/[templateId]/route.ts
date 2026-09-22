// Open Studio Template API - Client-side only
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ template: null });
}

export async function PUT() {
  return NextResponse.json({ error: 'Use client-side IndexedDB' }, { status: 400 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Use client-side IndexedDB' }, { status: 400 });
}
