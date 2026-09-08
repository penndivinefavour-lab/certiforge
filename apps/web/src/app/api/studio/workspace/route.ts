// Open Studio Workspace API
// This route is intentionally kept for potential future use.
// Open Studio operates purely client-side via IndexedDB in the browser.
import { NextResponse } from 'next/server';

export async function GET() {
  // Return minimal workspace info since IndexedDB is not available in SSR
  return NextResponse.json({
    workspace: null,
    projects: [],
    projectCount: 0,
    message: 'Open Studio operations must be performed client-side via IndexedDB',
  });
}
