import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { AuditLogger } from '@/lib/AuditLogger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member_id, wahana_id, quantity, terminal_name } = body;
    const parsedQuantity = parseInt(String(quantity), 10);
    if (!member_id || !wahana_id || isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return NextResponse.json({ success: false, error: 'Jumlah tiket tidak valid (harus minimal 1).' }, { status: 400 });
    }
    const safeQuantity = parsedQuantity;

    // 1. Dapatkan info wahana
    const { data: wahana, error: wErr } = await supabaseAdmin
      .from('wahanas')
      .select('name')
      .eq('id', wahana_id)
      .single();

    if (wErr || !wahana) {
      return NextResponse.json({ success: false, error: 'Wahana tidak ditemukan' }, { status: 404 });
    }

    // 2. Cek kuota voucher aktif
    let { data: existingVoucher, error: vErr } = await supabaseAdmin
      .from('member_wahana_vouchers')
      .select('id, quota, valid_until')
      .eq('member_id', member_id)
      .eq('wahana_id', wahana_id)
      .gte('valid_until', new Date().toISOString())
      .single();

    // Jika member belum memiliki record voucher wahana ini, alokasikan kuota bawaan paket otomatis
    if (vErr || !existingVoucher) {
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const { data: newVoucher } = await supabaseAdmin
        .from('member_wahana_vouchers')
        .insert([{
          member_id,
          wahana_id,
          quota: 2, // Kuota default bawaan Annual Pass
          valid_until: expiresAt
        }])
        .select('id, quota, valid_until')
        .single();

      if (newVoucher) {
        existingVoucher = newVoucher;
      } else {
        return NextResponse.json({ success: false, error: 'Voucher tidak ditemukan atau sudah kadaluarsa.' }, { status: 404 });
      }
    }

    if (existingVoucher.quota < safeQuantity) {
      return NextResponse.json({ success: false, error: `Kuota tiket habis. Sisa kuota Anda: ${existingVoucher.quota}` }, { status: 400 });
    }

    // 3. Potong kuota
    const newQuota = existingVoucher.quota - safeQuantity;
    const { error: updErr } = await supabaseAdmin
      .from('member_wahana_vouchers')
      .update({ quota: newQuota })
      .eq('id', existingVoucher.id);

    if (updErr) {
      console.error('Update voucher error:', updErr);
      return NextResponse.json({ success: false, error: 'Gagal memotong kuota voucher' }, { status: 500 });
    }

    // 4. Catat riwayat pemakaian di voucher_transactions & pos_transactions (untuk Rekonsiliasi Keuangan POS)
    const { data: txData, error: txErr } = await supabaseAdmin.from('voucher_transactions').insert({
      member_id,
      wahana_id,
      mutation_type: 'USAGE',
      quota_change: -safeQuantity, // negatif karena penggunaan
      description: `Digunakan di ${body.terminal_name || 'Wahana'}: ${safeQuantity}x ${wahana.name}`
    }).select('id').single();

    if (txErr) {
      console.error('Insert tx error:', txErr);
    }

    try {
      await supabaseAdmin.from('pos_transactions').insert({
        member_id,
        location: wahana.name || 'WAHANA',
        terminal_name: terminal_name || 'Kasir Wahana',
        amount: 0,
        points_earned: 0,
        payment_method: 'VOUCHER',
        invoice_number: `TUKAR-${Date.now().toString(36).toUpperCase()}`
      });
    } catch (posInsertErr) {
      console.error('Failed to log pos_transactions on voucher redeem:', posInsertErr);
    }

    // 5. Log audit
    await AuditLogger.log(request, 'UPDATE', 'POS_USE_WAHANA', txData?.id || existingVoucher.id, {
      member_id,
      wahana_id,
      quantity,
      terminal: terminal_name
    });

    return NextResponse.json({
      success: true,
      data: {
        remaining_quota: newQuota,
        quantity_used: quantity
      }
    });

  } catch (error: unknown) {
    console.error('POS Use Wahana Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
