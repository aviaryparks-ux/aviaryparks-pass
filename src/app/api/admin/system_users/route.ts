import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import bcrypt from 'bcryptjs';
import { AuditLogger } from '@/lib/AuditLogger';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_users')
      .select('id, username, role, created_at, wahana_id, wahanas(name)')
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
    const allowedRoles = ['ADMIN', 'GATE', 'WAHANA', 'CASHIER'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Role tidak valid' }, { status: 400 });
    }

    // Role WAHANA disimpan sebagai GATE di level database jika database dibatasi constraint, tapi tetap diarahkan ke /gate-wahana
    const dbRole = user.role === 'WAHANA' ? 'GATE' : user.role;

    // Hash password sebelum disimpan
    const hashedPassword = await bcrypt.hash(user.password, 12);

    const { data, error } = await supabaseAdmin.from('system_users').insert([{
      username: user.username,
      password: hashedPassword,
      role: dbRole,
      wahana_id: (user.wahana_id && user.wahana_id !== '') ? user.wahana_id : null,
    }]).select('id, username, role, created_at, wahana_id');

    if (error) throw error;

    if (data && data.length > 0) {
      await AuditLogger.log(request, 'CREATE', 'SYSTEM_USER', data[0].id, { username: user.username, role: user.role });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Insert error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to insert system_user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const { error } = await supabaseAdmin.from('system_users').delete().eq('id', id);
    if (error) throw error;

    await AuditLogger.log(request, 'DELETE', 'SYSTEM_USER', id, { user_id: id });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to delete system_user' }, { status: 500 });
  }
}

