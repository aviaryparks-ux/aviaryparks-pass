import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { voucher_code } = await request.json();

    if (!voucher_code) {
      return NextResponse.json({ error: 'Missing voucher code' }, { status: 400 });
    }

    // Find the voucher
    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from('member_vouchers')
      .select('*, rewards_catalog(*)')
      .eq('voucher_code', voucher_code.toUpperCase())
      .single();

    if (voucherError || !voucher) {
      console.error('Voucher Error:', voucherError);
      return NextResponse.json({ success: false, message: 'Kupon tidak ditemukan atau kode tidak valid' });
    }

    // Check expiration
    if (new Date(voucher.expires_at) < new Date()) {
      // Auto-update to EXPIRED if past due
      if (voucher.status === 'ACTIVE') {
        await supabaseAdmin.from('member_vouchers').update({ status: 'EXPIRED' }).eq('id', voucher.id);
      }
      return NextResponse.json({ success: false, message: 'Kupon sudah kedaluwarsa' });
    }

    // Check status
    if (voucher.status === 'USED') {
      return NextResponse.json({ success: false, message: 'Kupon ini sudah pernah digunakan' });
    }
    
    if (voucher.status === 'EXPIRED') {
      return NextResponse.json({ success: false, message: 'Kupon sudah kedaluwarsa' });
    }

    // Update status to USED
    const { error: updateError } = await supabaseAdmin
      .from('member_vouchers')
      .update({ 
        status: 'USED',
        used_at: new Date().toISOString()
      })
      .eq('id', voucher.id);

    if (updateError) {
      console.error('Failed to update voucher status:', updateError);
      return NextResponse.json({ success: false, error: 'Gagal memproses kupon' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Kupon berhasil digunakan!',
      data: {
        reward_name: voucher.rewards_catalog?.name,
        reward_type: voucher.rewards_catalog?.reward_type
      }
    });

  } catch (error: any) {
    console.error('Scan Voucher Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
