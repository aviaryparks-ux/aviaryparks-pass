import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET || 'super-secret-aviary-park-key-2026';
  return new TextEncoder().encode(secret);
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isGateRoute = pathname.startsWith('/gate') || pathname.startsWith('/api/gate');

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
      // Verify JWT
      const { payload } = await jwtVerify(token, getJwtSecretKey());
      
      // Check roles
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/gate/:path*', '/api/admin/:path*', '/api/gate/:path*'],
};
