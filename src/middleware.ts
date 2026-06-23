import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect Admin Route
  if (pathname.startsWith('/admin')) {
    const isAdmin = request.cookies.get('auth_admin')?.value === 'true';
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/system-login?callbackUrl=/admin', request.url));
    }
  }

  // Protect Gate Route
  if (pathname.startsWith('/gate')) {
    const isGate = request.cookies.get('auth_gate')?.value === 'true';
    if (!isGate) {
      return NextResponse.redirect(new URL('/system-login?callbackUrl=/gate', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/gate/:path*'],
};
