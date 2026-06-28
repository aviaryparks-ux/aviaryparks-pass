import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { groupId } = await request.json();

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
      // Karena Duitku tidak bisa mengirim callback ke localhost, kita simulasikan sukses
      if (process.env.NODE_ENV === 'development') {
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
