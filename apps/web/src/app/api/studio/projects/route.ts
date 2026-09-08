// Open Studio Projects API
// This route is intentionally kept for potential future use.
// Open Studio operates purely client-side via IndexedDB in the browser.
import { NextResponse } from 'next/server';

// These functions only work in browser context (IndexedDB not available server-side)
export async function GET() {
  // Return empty array since IndexedDB is not available in SSR
  return NextResponse.json({ projects: [] });
}

export async function POST(_request: Request) {
  // Open Studio project creation happens client-side via IndexedDB
  return NextResponse.json(
    { error: 'Open Studio operations must be performed client-side. Navigate to /studio/projects' },
    { status: 400 }
  );
}
