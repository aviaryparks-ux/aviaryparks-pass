import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { NotificationService } from '@/lib/NotificationService';
import { AuditLogger } from '@/lib/AuditLogger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member_id, wahana_id, quantity, terminal_name, invoice_number } = body;

    if (!member_id || !wahana_id || !quantity) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Dapatkan info wahana
    const { data: wahana, error: wErr } = await supabaseAdmin
      .from('wahanas')
      .select('name, topup_price')
      .eq('id', wahana_id)
      .single();

    if (wErr || !wahana) {
      return NextResponse.json({ success: false, error: 'Wahana tidak ditemukan' }, { status: 404 });
    }

    const totalAmount = wahana.topup_price * quantity;

    // 2. Insert transaksi POS (untuk Laporan Keuangan)
    const { data: posTx, error: posErr } = await supabaseAdmin.from('pos_transactions').insert({
      member_id,
      location: 'WAHANA',
      terminal_name: terminal_name || 'POS Wahana',
      amount: totalAmount,
      points_earned: 0,
      invoice_number: invoice_number || null
    }).select().single();

    if (posErr) {
      console.error('POS Transaction Error:', posErr);
      return NextResponse.json({ success: false, error: 'Gagal menyimpan transaksi' }, { status: 500 });
    }

    // 3. Upsert kuota wahana
    const { data: existingVoucher } = await supabaseAdmin
      .from('member_wahana_vouchers')
      .select('id, quota')
      .eq('member_id', member_id)
      .eq('wahana_id', wahana_id)
      .single();

    const validityDays = 30; // default 30 hari
    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

    if (existingVoucher) {
      const { error: updErr } = await supabaseAdmin
        .from('member_wahana_vouchers')
        .update({
          quota: existingVoucher.quota + quantity,
          valid_until: expiresAt
        })
        .eq('id', existingVoucher.id);
      if (updErr) console.error('Update voucher error:', updErr);
    } else {
      const { error: insErr } = await supabaseAdmin
        .from('member_wahana_vouchers')
        .insert({
          member_id,
          wahana_id,
          quota: quantity,
          valid_until: expiresAt
        });
      if (insErr) console.error('Insert voucher error:', insErr);
    }

    // 4. Catat riwayat penambahan kuota
    await supabaseAdmin.from('voucher_transactions').insert({
      member_id,
      wahana_id,
      mutation_type: 'TOPUP',
      quota_change: quantity,
      description: `Top-Up Kasir: ${quantity}x ${wahana.name}`
    });

    // 5. Send Notification
    try {
      const { data: member } = await supabaseAdmin.from('members').select('phone, name').eq('id', member_id).single();
      if (member && member.phone) {
        const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalAmount);
        const message = `🎉 *Pembayaran Berhasil!* 🎉\n\nHalo *${member.name}*,\nPembelian tiket wahana via Kasir berhasil.\n\n*Rincian*\nWahana: ${wahana.name}\nJumlah: ${quantity} Tiket\nTotal: ${formattedAmount}\n\nTiket sudah otomatis masuk ke dasbor Anda! 🎢`;
        await NotificationService.sendWhatsApp(member.phone, message);
      }
    } catch (err) {
      console.error('Failed to send WhatsApp notification:', err);
    }

    await AuditLogger.log(request, 'CREATE', 'POS_TOPUP_WAHANA', posTx.id, {
      member_id,
      wahana_id,
      quantity,
      amount: totalAmount,
      terminal: terminal_name
    });

    return NextResponse.json({
      success: true,
      data: {
        transaction_id: posTx.id,
        total_amount: totalAmount,
        quantity_added: quantity
      }
    });

  } catch (error: unknown) {
    console.error('POS Wahana Topup Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
