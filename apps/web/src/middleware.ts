import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiter state (in-memory, simple implementation)
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // max requests per window

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const record = rateLimits.get(clientIp);

  if (!record || now > record.resetTime) {
    rateLimits.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count += 1;
  return true;
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");

  // CORS headers for API routes
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  if (isApiRoute) {
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    if (allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
      // Same-origin by default
      response.headers.set('Access-Control-Allow-Origin', request.nextUrl.origin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  // Rate limiting for sensitive endpoints
  const path = request.nextUrl.pathname;
  const sensitivePaths = ['/api/auth', '/api/generation', '/api/certificates', '/api/verify'];
  const isSensitive = sensitivePaths.some(p => path.startsWith(p));

  if (isSensitive) {
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/studio/:path*',
    '/auth/:path*',
  ],
};
