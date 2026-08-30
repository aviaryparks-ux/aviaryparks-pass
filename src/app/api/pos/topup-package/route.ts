import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member_id, package_id, terminal_name, invoice_number } = body;

    if (!member_id || !package_id) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Dapatkan info paket beserta daftar wahananya
    const { data: pkg, error: pErr } = await supabaseAdmin
      .from('ticket_packages')
      .select('*, package_wahanas(wahana_id, quantity)')
      .eq('id', package_id)
      .single();

    if (pErr || !pkg) {
      return NextResponse.json({ success: false, error: 'Paket tidak ditemukan' }, { status: 404 });
    }

    if (!pkg.package_wahanas || pkg.package_wahanas.length === 0) {
      return NextResponse.json({ success: false, error: 'Paket ini tidak berisi wahana apapun' }, { status: 400 });
    }

    // Hanya bisa beli 1 paket (kuantitas = 1)
    const totalAmount = pkg.price;

    // 2. Insert transaksi POS (untuk Laporan Keuangan)
    const { data: posTx, error: posErr } = await supabaseAdmin.from('pos_transactions').insert({
      member_id,
      location: 'PAKET BUNDLING',
      terminal_name: terminal_name || 'POS Wahana',
      amount: totalAmount,
      points_earned: 0,
      invoice_number: invoice_number || null
    }).select().single();

    if (posErr) {
      console.error('POS Transaction Error:', posErr);
      return NextResponse.json({ success: false, error: 'Gagal menyimpan transaksi keuangan' }, { status: 500 });
    }

    // 3. Tambahkan kuota untuk setiap wahana di dalam paket
    for (const item of pkg.package_wahanas) {
      const wahanaId = item.wahana_id;
      const quantityToAdd = item.quantity;

      // Cek apakah member sudah punya voucher untuk wahana ini
      const { data: existingVoucher } = await supabaseAdmin
        .from('member_wahana_vouchers')
        .select('id, quota')
        .eq('member_id', member_id)
        .eq('wahana_id', wahanaId)
        .single();

      let currentQuota = 0;
      if (existingVoucher) {
        currentQuota = existingVoucher.quota;
        
        // Update kuota
        const { error: updateErr } = await supabaseAdmin
          .from('member_wahana_vouchers')
          .update({ quota: currentQuota + quantityToAdd, updated_at: new Date().toISOString() })
          .eq('id', existingVoucher.id);
          
        if (updateErr) {
           console.error('Update voucher error:', updateErr);
           // Kita lanjutkan saja ke wahana berikutnya meskipun gagal satu
        }
      } else {
        // Insert kuota baru
        const { error: insertErr } = await supabaseAdmin
          .from('member_wahana_vouchers')
          .insert({
            member_id,
            wahana_id: wahanaId,
            quota: quantityToAdd
          });
          
        if (insertErr) {
           console.error('Insert voucher error:', insertErr);
        }
      }
    }

    // 4. Catat ke tabel audit (satu catatan untuk paket)
    await supabaseAdmin.from('voucher_transactions').insert({
      member_id,
      wahana_id: null, // Karena ini paket, wahana_id bisa dikosongkan atau diisi salah satu
      transaction_type: 'TOPUP',
      quantity: 1,
      notes: `Top-Up Paket Bundling: ${pkg.name}`,
      performed_by: terminal_name || 'System'
    });

    return NextResponse.json({ success: true, message: 'Paket berhasil ditambahkan' });

  } catch (error: any) {
    console.error('Error processing topup package:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
