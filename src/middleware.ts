import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set!');
  }
  return new TextEncoder().encode(secret);
};

// ── SECURITY: Allowed origins for CSRF protection ──
const getAllowedOrigins = (): string[] => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const allowed = [baseUrl];

  // Allow localhost variations in development
  if (baseUrl.includes('localhost')) {
    allowed.push('http://localhost:3000');
    allowed.push('http://127.0.0.1:3000');
  }

  return allowed;
};

/**
 * Validate Origin header to prevent CSRF attacks.
 * Only allow requests from trusted origins.
 */
const validateOrigin = (request: NextRequest): boolean => {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // Skip for same-origin requests (no Origin header needed)
  if (!origin) {
    return true;
  }

  // Skip for GET requests (they shouldn't modify state)
  if (request.method === 'GET') {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // For production, log suspicious requests
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[SECURITY] Blocked request with unauthorized origin: ${origin} from host: ${host}`);
  }

  return false;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── SECURITY: Origin validation for state-changing requests ──
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    if (!validateOrigin(request)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden: Invalid origin' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/?error=invalid-origin', request.url));
    }
  }

  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isGateRoute = pathname.startsWith('/gate') || pathname.startsWith('/api/gate');
  const isVisitorApiRoute = pathname.startsWith('/api/visitor');
  const isVisitorPageRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  // ── Admin & Gate: cek system_token ──────────────────────────────────────
  if (isAdminRoute || isGateRoute) {
    const token = request.cookies.get('system_token')?.value;

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const callbackUrl = pathname;
      return NextResponse.redirect(new URL(`/system-login?callbackUrl=${encodeURIComponent(callbackUrl)}`, request.url));
    }

    try {
      const { payload } = await jwtVerify(token, getJwtSecretKey());

      if (isAdminRoute && payload.role !== 'ADMIN') {
        throw new Error('Not Admin');
      }
      if (isGateRoute && payload.role !== 'GATE' && payload.role !== 'ADMIN') {
        throw new Error('Not Gate');
      }

      return NextResponse.next();
    } catch (err) {
      console.error('JWT Verification failed:', err);
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/system-login?error=unauthorized', request.url));
    }
  }

  // ── Visitor: cek visitor_token ───────────────────────────────────────────
  if (isVisitorApiRoute || isVisitorPageRoute) {
    const token = request.cookies.get('visitor_token')?.value;

    if (!token) {
      if (isVisitorApiRoute) {
        return NextResponse.json({ error: 'Unauthorized. Silakan login kembali.' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login?error=session-expired', request.url));
    }

    try {
      const { payload } = await jwtVerify(token, getJwtSecretKey());
      if (payload.role !== 'VISITOR') throw new Error('Not Visitor');
      return NextResponse.next();
    } catch (err) {
      console.error('Visitor JWT Verification failed:', err);
      if (isVisitorApiRoute) {
        return NextResponse.json({ error: 'Unauthorized. Silakan login kembali.' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login?error=session-expired', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/gate/:path*',
    '/api/admin/:path*',
    '/api/gate/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/api/visitor/:path*',
  ],
};

