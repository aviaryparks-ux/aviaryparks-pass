import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // SECURITY: Ensure this can only be called by authorized cron scheduler.
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 });
    }

    const nowIso = new Date().toISOString();

    // 1. Expire Vouchers
    const { data: vouchers, error: voucherErr } = await supabaseAdmin
      .from('member_vouchers')
      .update({ status: 'EXPIRED' })
      .lt('expires_at', nowIso)
      .eq('status', 'ACTIVE')
      .select('id');

    if (voucherErr) throw voucherErr;

    // 2. Expire Members whose valid_until date has passed
    const { data: members, error: memberErr } = await supabaseAdmin
      .from('members')
      .update({ status: 'EXPIRED' })
      .lt('valid_until', nowIso)
      .eq('status', 'ACTIVE')
      .select('id, name');

    if (memberErr) throw memberErr;

    return NextResponse.json({
      success: true,
      expired_vouchers_count: vouchers?.length || 0,
      expired_members_count: members?.length || 0,
      timestamp: nowIso,
      message: 'Daily cron executed successfully'
    });
  } catch (error: any) {
    console.error('Daily cron error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
