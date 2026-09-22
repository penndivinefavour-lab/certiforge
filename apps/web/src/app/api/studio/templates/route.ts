// Open Studio Templates API
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ templates: [], count: 0 });
}

export async function POST() {
  return NextResponse.json({ templates: [], count: 0 });
}
