import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';
import * as jose from 'jose';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set!');
  }
  return new TextEncoder().encode(secret);
};

export async function POST(request: Request) {
  try {
    const { message, stack, url } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Coba dapatkan info pengguna dari cookies
    let userInfo = null;
    const cookieStore = await cookies();
    
    // Cek pengunjung biasa
    const visitorToken = cookieStore.get('visitor_token')?.value;
    if (visitorToken) {
      try {
        const { payload } = await jose.jwtVerify(visitorToken, getJwtSecretKey());
        userInfo = { type: 'VISITOR', id: payload.sub, username: payload.username };
      } catch (e) {
        // Abaikan jika token invalid
      }
    } else {
      // Cek admin/kasir/gate
      const systemToken = cookieStore.get('system_token')?.value;
      if (systemToken) {
        try {
          const { payload } = await jose.jwtVerify(systemToken, getJwtSecretKey());
          userInfo = { type: 'SYSTEM', id: payload.sub, username: payload.username, role: payload.role };
        } catch (e) {
          // Abaikan jika token invalid
        }
      }
    }

    const { error } = await supabaseAdmin.from('system_error_logs').insert([{
      error_message: message,
      error_stack: stack || null,
      url: url || request.url,
      user_info: userInfo
    }]);

    if (error) {
      console.error('Failed to log error to database:', error);
      return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in Error Logger API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
