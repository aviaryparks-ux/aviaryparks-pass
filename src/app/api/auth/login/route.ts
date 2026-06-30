import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Gunakan Service Role Key agar tidak bergantung konfigurasi RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set!');
  }
  return new TextEncoder().encode(secret);
};

export async function POST(request: NextRequest) {
  try {
    const { username, password, callbackUrl } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan Password wajib diisi' }, { status: 400 });
    }

    // Cari user berdasarkan username saja, lalu verifikasi password secara aman
    const { data, error } = await supabase
      .from('system_users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Username atau Password salah!' }, { status: 401 });
    }

    // Strategi dual-check: support password lama (plaintext) & baru (bcrypt hash)
    // Ini memungkinkan migrasi bertahap tanpa merusak login user yang sudah ada
    const isBcryptHash = data.password?.startsWith('$2');
    let isPasswordValid = false;

    if (isBcryptHash) {
      // Password sudah di-hash, gunakan bcrypt.compare
      isPasswordValid = await bcrypt.compare(password, data.password);
    } else {
      // Password masih plaintext (user lama), bandingkan langsung
      isPasswordValid = (password === data.password);

      // Auto-upgrade: hash password sekarang untuk login berikutnya
      if (isPasswordValid) {
        const hashed = await bcrypt.hash(password, 12);
        await supabase
          .from('system_users')
          .update({ password: hashed })
          .eq('id', data.id);
      }
    }

    if (!isPasswordValid) {
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
    .setExpirationTime('24h')
    .sign(getJwtSecretKey());

    // Default routing based on role if no specific callbackUrl was provided (or if it's just '/')
    let finalRedirect = callbackUrl && callbackUrl !== '/' ? callbackUrl : null;
    if (!finalRedirect) {
      if (data.role === 'ADMIN') finalRedirect = '/admin';
      else if (data.role === 'GATE') finalRedirect = '/gate';
      else finalRedirect = '/';
    }

    // Create the response and set the HTTPOnly cookie
    const response = NextResponse.json({ 
      success: true, 
      username: data.username,
      role: data.role,
      redirect: finalRedirect
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
    return NextResponse.json({ error: `Terjadi kesalahan sistem internal: ${err.message}` }, { status: 500 });
  }
}
