import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_users')
      // Jangan expose password ke frontend
      .select('id, username, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to fetch system_users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await request.json();

    // Validasi field wajib
    if (!user.username || !user.password || !user.role) {
      return NextResponse.json({ success: false, error: 'username, password, dan role wajib diisi' }, { status: 400 });
    }

    // Validasi role yang diizinkan
    const allowedRoles = ['ADMIN', 'GATE'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Role tidak valid' }, { status: 400 });
    }

    // Hash password sebelum disimpan
    const hashedPassword = await bcrypt.hash(user.password, 12);

    const { data, error } = await supabaseAdmin.from('system_users').insert([{
      username: user.username,
      password: hashedPassword,
      role: user.role,
    }]).select('id, username, role, created_at');

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to insert system_user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const { error } = await supabaseAdmin.from('system_users').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to delete system_user' }, { status: 500 });
  }
}

