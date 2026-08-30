import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_users')
      .select('id, username, wahana_id, wahanas(id, name)')
      .eq('role', 'CASHIER')
      .order('username', { ascending: true });

    if (error) throw error;
    
    // Map to the expected format { id, name, wahana_id, wahana_name }
    const formattedData = data.map(user => ({
      id: user.id,
      name: user.username,
      wahana_id: user.wahana_id,
      wahana_name: (user.wahanas as any)?.name || null
    }));

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to fetch cashiers' }, { status: 500 });
  }
}
