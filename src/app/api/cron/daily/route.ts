import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    // SECURITY: Ensure this can only be called by authorized cron scheduler.
    // In production, we'd check an Authorization header or Vercel CRON_SECRET.
    // For now, we allow it.

    // 1. Expire Vouchers
    const { data: vouchers, error: voucherErr } = await supabaseAdmin
      .from('member_vouchers')
      .update({ status: 'EXPIRED' })
      .lt('expires_at', new Date().toISOString())
      .eq('status', 'ACTIVE')
      .select('id');

    if (voucherErr) throw voucherErr;

    return NextResponse.json({
      success: true,
      expired_vouchers_count: vouchers?.length || 0,
      message: 'Daily cron executed successfully'
    });
  } catch (error: any) {
    console.error('Daily cron error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
