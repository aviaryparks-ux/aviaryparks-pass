import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase (Note: we should ideally use a service role key here if available, 
// but anon key is okay if RLS allows us to query system_users by username).
// For the sake of this API route, we are on the server side.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const getJwtSecretKey = () => {
  // Use a fallback secret for development if env var is not set, 
  // but strongly recommend setting JWT_SECRET in production.
  const secret = process.env.JWT_SECRET || 'super-secret-aviary-park-key-2026';
  return new TextEncoder().encode(secret);
};

export async function POST(request: NextRequest) {
  try {
    const { username, password, callbackUrl } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan Password wajib diisi' }, { status: 400 });
    }

    // Server-side check against Supabase
    const { data, error } = await supabase
      .from('system_users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Username atau Password salah!' }, { status: 401 });
    }

    const isGate = callbackUrl?.startsWith('/gate');
    const isAdmin = callbackUrl?.startsWith('/admin');

    // Check role mapping
    if (isAdmin && data.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak! Akun ini bukan Super Admin.' }, { status: 403 });
    }

    if (isGate && data.role !== 'GATE' && data.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak! Akun ini tidak memiliki akses Gate.' }, { status: 403 });
    }

    // Success! Generate JWT Token
    const token = await new SignJWT({ 
      username: data.username, 
      role: data.role,
      sub: data.id
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Token expires in 24 hours
    .sign(getJwtSecretKey());

    // Create the response and set the HTTPOnly cookie
    const response = NextResponse.json({ 
      success: true, 
      username: data.username,
      role: data.role,
      redirect: callbackUrl || '/'
    });

    response.cookies.set({
      name: 'system_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;

  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem internal.' }, { status: 500 });
  }
}
