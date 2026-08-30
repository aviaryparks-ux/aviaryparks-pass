import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');

    if (!memberId) {
      return NextResponse.json({ error: 'Missing member_id' }, { status: 400 });
    }

    const type = searchParams.get('type');

    if (type === 'history') {
      const { data: vouchers } = await supabaseAdmin
        .from('member_wahana_vouchers')
        .select('*, wahanas(name)')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      const { data: memberData } = await supabaseAdmin
        .from('members')
        .select('group_id')
        .eq('id', memberId)
        .single();

      const groupId = memberData?.group_id || memberId;

      const { data: dbTransactions } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .or(`group_id.eq.${groupId},group_id.eq.${memberId}`)
        .order('created_at', { ascending: false });

      const { data: posTransactions } = await supabaseAdmin
        .from('pos_transactions')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      const { data: voucherLogs } = await supabaseAdmin
        .from('voucher_transactions')
        .select('*, wahanas(name)')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      return NextResponse.json({
        success: true,
        data: {
          vouchers: vouchers || [],
          transactions: dbTransactions || [],
          posTransactions: posTransactions || [],
          voucherLogs: voucherLogs || []
        }
      });
    }

    const { data, error } = await supabaseAdmin
      .from('member_wahana_vouchers')
      .select('*, wahanas(name)')
      .eq('member_id', memberId)
      .gt('quota', 0) // only show active ones with quota > 0
      .gte('valid_until', new Date().toISOString()) // not expired
      .order('valid_until', { ascending: true });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching visitor vouchers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch vouchers' }, { status: 500 });
  }
}
