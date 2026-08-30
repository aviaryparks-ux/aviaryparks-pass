import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const text = await request.text();
    const params = new URLSearchParams(text);
    
    const merchantCode = params.get('merchantCode');
    const amount = params.get('amount');
    const merchantOrderId = params.get('merchantOrderId');
    const signature = params.get('signature');
    const resultCode = params.get('resultCode');

    if (!merchantCode || !amount || !merchantOrderId || !signature) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const myMerchantCode = process.env.NEXT_PUBLIC_DUITKU_MERCHANT_CODE || '';
    const myMerchantKey = process.env.DUITKU_MERCHANT_KEY || '';

    const expectedSignatureStr = `${myMerchantCode}${amount}${merchantOrderId}${myMerchantKey}`;
    const expectedSignature = crypto.createHash('md5').update(expectedSignatureStr).digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    const isValidSignature =
      sigBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    if (!isValidSignature) {
      console.error('Invalid signature in callback', { signature, expectedSignature });
      return NextResponse.json({ error: 'Bad Signature' }, { status: 400 });
    }

    if (resultCode === '00') {
      console.log(`Payment Success for order: ${merchantOrderId}`);

      // ── ATOMIC UPDATE: Cegah Race Condition ──
      // Coba perbarui dari PENDING menjadi SUCCESS. Jika sudah bukan PENDING (atau tidak ada), ini akan me-return array kosong.
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('transactions')
        .update({ status: 'SUCCESS' })
        .eq('merchant_order_id', merchantOrderId)
        .eq('status', 'PENDING')
        .select();

      if (updateError) {
        console.error('Failed to update transaction status:', updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      // Jika updateData kosong, berarti pesanan sudah di-update oleh proses callback lain (Double callback).
      if (!updateData || updateData.length === 0) {
        console.log(`Order ${merchantOrderId} already processed or not found in PENDING state, skipping.`);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      const trx = updateData[0];

      // Handle Wahana Satuan Top-Up
      if (merchantOrderId.startsWith('WAHANA-') && trx.package_name?.startsWith('WAHANA_TOPUP|')) {
        const parts = trx.package_name.split('|');
        const wahanaId = parts[1];
        const quantity = parseInt(parts[2]);
        const wahanaName = parts[3];
        const memberId = trx.group_id; // we stored memberId in group_id

        // Upsert to member_wahana_vouchers
        const { data: existingVoucher } = await supabaseAdmin
          .from('member_wahana_vouchers')
          .select('id, quota')
          .eq('member_id', memberId)
          .eq('wahana_id', wahanaId)
          .single();

        const validityDays = 30; // default
        const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

        if (existingVoucher) {
          await supabaseAdmin
            .from('member_wahana_vouchers')
            .update({
              quota: existingVoucher.quota + quantity,
              valid_until: expiresAt
            })
            .eq('id', existingVoucher.id);
        } else {
          await supabaseAdmin
            .from('member_wahana_vouchers')
            .insert({
              member_id: memberId,
              wahana_id: wahanaId,
              quota: quantity,
              valid_until: expiresAt
            });
        }

        // Add history log
        await supabaseAdmin.from('voucher_transactions').insert({
          member_id: memberId,
          wahana_id: wahanaId,
          mutation_type: 'TOPUP',
          quota_change: quantity,
          description: `Pembelian Online: ${quantity}x ${wahanaName}`
        });

        // Clean up package_name in transactions so it looks good in Admin
        await supabaseAdmin.from('transactions')
          .update({ package_name: `Top-Up Wahana ${wahanaName}` })
          .eq('id', trx.id);

        try {
          const { data: member } = await supabaseAdmin.from('members').select('phone, name').eq('id', memberId).single();
          if (member && member.phone) {
            const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(trx.amount || 0);
            const message = `🎉 *Pembayaran Berhasil!* 🎉\n\nHalo *${member.name}*,\nPembelian tiket wahana Anda berhasil diverifikasi.\n\n*Rincian*\nWahana: ${wahanaName}\nJumlah: ${quantity} Tiket\nTotal: ${formattedAmount}\n\nTiket sudah otomatis masuk ke dasbor Anda dan siap digunakan di gate wahana! 🎢`;
            await sendWhatsAppMessage(member.phone, message);
          }
        } catch (err) {
          console.error('Failed to send WhatsApp message:', err);
        }

        return NextResponse.json({ success: true }, { status: 200 });
      }

      // Handle Paket Bundling Top-Up
      if (merchantOrderId.startsWith('BUNDLE-') && trx.package_name?.startsWith('BUNDLE_TOPUP|')) {
        const parts = trx.package_name.split('|');
        const bundleId = parts[1];
        const bundleQty = parseInt(parts[2]) || 1;
        const bundleName = parts[3];
        const memberId = trx.group_id;

        const { data: bundleData } = await supabaseAdmin
          .from('ticket_packages')
          .select('name, package_wahanas(wahana_id, quantity, wahanas(name))')
          .eq('id', bundleId)
          .single();

        if (bundleData && bundleData.package_wahanas && bundleData.package_wahanas.length > 0) {
          const validityDays = 60; // 2 bulan untuk paket bundling
          const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

          for (const pw of bundleData.package_wahanas) {
            const totalQty = pw.quantity * bundleQty;

            const { data: existingVoucher } = await supabaseAdmin
              .from('member_wahana_vouchers')
              .select('id, quota')
              .eq('member_id', memberId)
              .eq('wahana_id', pw.wahana_id)
              .single();

            if (existingVoucher) {
              await supabaseAdmin
                .from('member_wahana_vouchers')
                .update({
                  quota: existingVoucher.quota + totalQty,
                  valid_until: expiresAt
                })
                .eq('id', existingVoucher.id);
            } else {
              await supabaseAdmin
                .from('member_wahana_vouchers')
                .insert({
                  member_id: memberId,
                  wahana_id: pw.wahana_id,
                  quota: totalQty,
                  valid_until: expiresAt
                });
            }

            await supabaseAdmin.from('voucher_transactions').insert({
              member_id: memberId,
              wahana_id: pw.wahana_id,
              mutation_type: 'TOPUP',
              quota_change: totalQty,
              description: `Top-Up Online: ${bundleName} (${(pw as any).wahanas?.name || 'Wahana'} x${totalQty})`
            });
          }
        }

        await supabaseAdmin.from('transactions')
          .update({ package_name: `Paket Bundling ${bundleName}` })
          .eq('id', trx.id);

        try {
          const { data: member } = await supabaseAdmin.from('members').select('phone, name').eq('id', memberId).single();
          if (member && member.phone) {
            const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(trx.amount || 0);
            const message = `🎉 *Pembayaran Berhasil!* 🎉\n\nHalo *${member.name}*,\nPembelian ${bundleName} berhasil diverifikasi.\n\n*Rincian*\nPaket: ${bundleName}\nTotal: ${formattedAmount}\n\nSeluruh tiket wahana bundling sudah otomatis masuk ke dasbor Anda dan siap digunakan di gate wahana! 🎢`;
            await sendWhatsAppMessage(member.phone, message);
          }
        } catch (err) {
          console.error('Failed to send WhatsApp message:', err);
        }

        return NextResponse.json({ success: true }, { status: 200 });
      }

      // Handle Membership Activation (Default)
      const actualGroupId = merchantOrderId.split('-').slice(0, 5).join('-');

      let { data: activatedMembers, error } = await supabaseAdmin
        .from('members')
        .update({ 
          status: 'ACTIVE',
          activation_date: new Date().toISOString()
        })
        .or(`group_id.eq.${actualGroupId},id.eq.${actualGroupId}`)
        .select('id, name, role, group_id');

      if (!activatedMembers || activatedMembers.length === 0) {
        const { data: existing } = await supabaseAdmin
          .from('members')
          .select('id, name, role, group_id')
          .or(`group_id.eq.${actualGroupId},id.eq.${actualGroupId}`);
        activatedMembers = existing || [];
      }

      // ── BONUS VOUCHER WAHANA BAWAAN PAKET ANNUAL PASS ──
      // Jika paket memiliki bonus wahana di package_wahanas, berikan ke primary member
      try {
        if (trx.package_name && activatedMembers && activatedMembers.length > 0) {
          const primaryMember = activatedMembers.find((m: any) => m.role === 'PRIMARY') || activatedMembers[0];
          
          // Cari paket berdasarkan nama atau match fleksibel
          const { data: pkgList } = await supabaseAdmin
            .from('ticket_packages')
            .select('id, name, package_wahanas(wahana_id, quantity, wahanas(name))');

          const pkgData = pkgList?.find(p => 
            p.name.toLowerCase().trim() === (trx.package_name || '').toLowerCase().trim() ||
            (trx.package_name && p.name.toLowerCase().includes(trx.package_name.toLowerCase())) ||
            (trx.package_name && trx.package_name.toLowerCase().includes(p.name.toLowerCase()))
          );

          if (pkgData && pkgData.package_wahanas && pkgData.package_wahanas.length > 0) {
            const validityDays = 365; // Masa aktif voucher annual pass 1 tahun
            const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

            for (const pw of pkgData.package_wahanas) {
              const { data: existingVoucher } = await supabaseAdmin
                .from('member_wahana_vouchers')
                .select('id, quota')
                .eq('member_id', primaryMember.id)
                .eq('wahana_id', pw.wahana_id)
                .single();

              if (existingVoucher) {
                await supabaseAdmin
                  .from('member_wahana_vouchers')
                  .update({
                    quota: existingVoucher.quota + pw.quantity,
                    valid_until: expiresAt
                  })
                  .eq('id', existingVoucher.id);
              } else {
                await supabaseAdmin
                  .from('member_wahana_vouchers')
                  .insert({
                    member_id: primaryMember.id,
                    wahana_id: pw.wahana_id,
                    quota: pw.quantity,
                    valid_until: expiresAt
                  });
              }

              // History log voucher
              await supabaseAdmin.from('voucher_transactions').insert({
                member_id: primaryMember.id,
                wahana_id: pw.wahana_id,
                mutation_type: 'TOPUP',
                quota_change: pw.quantity,
                description: `Bonus Paket Annual Pass: ${(pw as any).wahanas?.name || 'Wahana'} x${pw.quantity}`
              });
            }
          }
        }
      } catch (voucherErr) {
        console.error('Failed to distribute bonus package vouchers:', voucherErr);
      }

      try {
        const { data: member } = await supabaseAdmin.from('members').select('phone, name').eq('group_id', actualGroupId).eq('role', 'PRIMARY').single();
        
        if (member && member.phone) {
          const packageName = trx.package_name || 'Tiket Aviary Park';
          const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(trx.amount || 0);
          const shortGroupId = actualGroupId.split('-')[0].toUpperCase();
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://aviarypark.com';
          
          const message = `🎉 *Pembayaran Berhasil!* 🎉\n\nHalo *${member.name}*,\nTerima kasih telah bergabung! Pembayaran Anda telah kami verifikasi.\n\n*Rincian Pembayaran*\nRegistrasi: ${shortGroupId}\nPaket: ${packageName}\nTotal: ${formattedAmount}\n\nLangkah selanjutnya:\n1. Masuk ke Dasbor: ${baseUrl}/login\n2. Daftarkan wajah Anda (Face Biometric) untuk akses masuk fisik.\n\nSampai jumpa di Aviary Park Indonesia! 🦜`;
          
          await sendWhatsAppMessage(member.phone, message);
        }
      } catch (err) {
        console.error('Failed to send WhatsApp message:', err);
      }

    } else {
      console.log(`Payment Failed or Pending for order: ${merchantOrderId}, ResultCode: ${resultCode}`);
      await supabaseAdmin.from('transactions').update({ status: 'FAILED' }).eq('merchant_order_id', merchantOrderId);
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Payment Callback Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
