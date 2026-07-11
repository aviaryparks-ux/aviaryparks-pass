import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_users')
      .select('id, username')
      .eq('role', 'CASHIER')
      .order('username', { ascending: true });

    if (error) throw error;
    
    // Map to the expected format { id, name }
    const formattedData = data.map(user => ({
      id: user.id,
      name: user.username
    }));

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to fetch cashiers' }, { status: 500 });
  }
}
