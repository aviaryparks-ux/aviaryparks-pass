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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

