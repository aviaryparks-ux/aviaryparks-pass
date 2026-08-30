import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');

    if (!memberId) {
      return NextResponse.json({ success: false, error: 'Missing member_id' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('member_wahana_vouchers')
      .select('*, wahanas(name, id)')
      .eq('member_id', memberId)
      .gt('quota', 0)
      .gte('valid_until', new Date().toISOString())
      .order('valid_until', { ascending: true });

    if (error) {
      console.error('Error fetching member vouchers:', error);
      return NextResponse.json({ success: false, error: 'Gagal memuat voucher' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('POS member-vouchers API error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
