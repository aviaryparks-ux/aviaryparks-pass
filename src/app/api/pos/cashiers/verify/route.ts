import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { username, pin } = await request.json();

    if (!username || !pin) {
      return NextResponse.json({ success: false, error: 'Username and PIN are required' }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('system_users')
      .select('id, username, password, role')
      .eq('username', username)
      .eq('role', 'CASHIER')
      .single();

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Cashier not found' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(pin, user.password);

    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
    }

    return NextResponse.json({ success: true, cashier: { id: user.id, name: user.username } });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to verify PIN' }, { status: 500 });
  }
}
