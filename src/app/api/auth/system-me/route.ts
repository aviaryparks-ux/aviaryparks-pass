import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('system_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const userId = (payload.sub as string) || (payload.userId as string);

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('system_users')
      .select('id, username, role, wahana_id, wahanas(id, name)')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.username,
        role: user.role,
        wahana_id: user.wahana_id,
        wahana_name: (user.wahanas as any)?.name || null
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
