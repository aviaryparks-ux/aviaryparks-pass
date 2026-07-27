import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { groupId, resultCode } = body;

    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    }

    const { data: pendingMembers, error } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('group_id', groupId)
      .eq('status', 'PENDING_PAYMENT');

    if (error) {
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }

    if (pendingMembers && pendingMembers.length > 0) {

      // SIMULASI WEBHOOK UNTUK LOCALHOST
      // Gunakan env var khusus ENABLE_PAYMENT_SIMULATION=true di .env.local
      // ATAU izinkan jika resultCode = '00' dari parameter URL Duitku (khusus untuk mode development)
      if (process.env.ENABLE_PAYMENT_SIMULATION === 'true' || (process.env.NODE_ENV === 'development' && resultCode === '00')) {
        await supabaseAdmin
          .from('members')
          .update({ 
            status: 'ACTIVE',
            activation_date: new Date().toISOString()
          })
          .eq('group_id', groupId)
          .eq('status', 'PENDING_PAYMENT');
          
        await supabaseAdmin
          .from('transactions')
          .update({ status: 'SUCCESS' })
          .eq('group_id', groupId)
          .eq('status', 'PENDING');
        return NextResponse.json({ success: true, status: 'ACTIVE', simulated: true });
      }

      return NextResponse.json({ success: true, status: 'PENDING' });
    }

    return NextResponse.json({ success: true, status: 'ACTIVE' });

  } catch (error: any) {
    console.error('Check Status Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
