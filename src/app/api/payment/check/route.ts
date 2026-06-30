import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPaymentReceiptEmail } from '@/lib/email';

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
      // Gunakan env var khusus ENABLE_PAYMENT_SIMULATION=true di .env.local
      // JANGAN set ini di production/staging!
      if (process.env.ENABLE_PAYMENT_SIMULATION === 'true') {
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
          
        // Simulate email sending on local dev
        try {
          const { data: member } = await supabaseAdmin.from('members').select('email, name').eq('group_id', groupId).eq('role', 'PRIMARY').single();
          const { data: trx } = await supabaseAdmin.from('transactions').select('amount, package_name').eq('group_id', groupId).order('created_at', { ascending: false }).limit(1).single();
          
          if (member && member.email) {
            const packageName = trx?.package_name || 'Tiket Aviary Park';
            const amount = trx?.amount || 0;
            await sendPaymentReceiptEmail(member.email, member.name, groupId, packageName, amount);
          }
        } catch (err) {
          console.error('Failed to send simulated email:', err);
        }
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
