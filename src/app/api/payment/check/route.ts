import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { groupId, orderId, resultCode } = body;

    if (!groupId && !orderId) {
      return NextResponse.json({ error: 'Missing groupId or orderId' }, { status: 400 });
    }

    const merchantCode = process.env.NEXT_PUBLIC_DUITKU_MERCHANT_CODE || '';
    const merchantKey = process.env.DUITKU_MERCHANT_KEY || '';
    const isSandbox = process.env.DUITKU_ENV === 'sandbox';

    // ── 1. JIKA MEMERIKSA ORDER POS SPESIFIK (WAHANA/BUNDLE TOPUP) ──
    if (orderId) {
      const { data: trx, error: trxErr } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('merchant_order_id', orderId)
        .single();

      if (trxErr || !trx) {
        return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan' }, { status: 404 });
      }

      if (trx.status === 'SUCCESS') {
        return NextResponse.json({ success: true, status: 'SUCCESS', message: 'Sudah dibayar' });
      }

      // Tanya langsung ke API Duitku Check Transaction Status
      // MD5(merchantCode + merchantOrderId + merchantKey)
      const sig = crypto.createHash('md5').update(`${merchantCode}${orderId}${merchantKey}`).digest('hex');
      const duitkuCheckEndpoint = isSandbox
        ? 'https://sandbox.duitku.com/webapi/api/merchant/transactionStatus'
        : 'https://passport.duitku.com/webapi/api/merchant/transactionStatus';

      const dRes = await fetch(duitkuCheckEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantCode,
          merchantOrderId: orderId,
          signature: sig
        })
      });

      const dData = await dRes.json();
      console.log('Duitku Status Inquiry:', dData);

      // Status 00 = SUCCESS di Duitku
      if (dData.statusCode === '00') {
        // Eksekusi Callback logic untuk top-up
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payment/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            merchantCode,
            amount: String(trx.amount),
            merchantOrderId: orderId,
            signature: crypto.createHash('md5').update(`${merchantCode}${trx.amount}${orderId}${merchantKey}`).digest('hex'),
            resultCode: '00'
          }).toString()
        });

        return NextResponse.json({ success: true, status: 'SUCCESS' });
      } else {
        // Belum dibayar / masih pending
        return NextResponse.json({ 
          success: false, 
          status: 'PENDING', 
          message: dData.statusMessage || 'Menunggu pembayaran dari pengunjung' 
        });
      }
    }

    // ── 2. JIKA MEMERIKSA REGISTRASI ANGGOTA (ANNUAL PASS) ──
    const { data: pendingMembers, error } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('group_id', groupId)
      .eq('status', 'PENDING_PAYMENT');

    if (error) {
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }

    if (pendingMembers && pendingMembers.length > 0) {
      // Cari transaksi pending terakhir
      const { data: latestTrx } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestTrx) {
        const sig = crypto.createHash('md5').update(`${merchantCode}${latestTrx.merchant_order_id}${merchantKey}`).digest('hex');
        const duitkuCheckEndpoint = isSandbox
          ? 'https://sandbox.duitku.com/webapi/api/merchant/transactionStatus'
          : 'https://passport.duitku.com/webapi/api/merchant/transactionStatus';

        const dRes = await fetch(duitkuCheckEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantCode,
            merchantOrderId: latestTrx.merchant_order_id,
            signature: sig
          })
        });

        const dData = await dRes.json();
        if (dData.statusCode === '00') {
          // Eksekusi Callback logic untuk Aktivasi Member & Bonus Voucher Wahana
          try {
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payment/callback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                merchantCode,
                amount: String(latestTrx.amount),
                merchantOrderId: latestTrx.merchant_order_id,
                signature: crypto.createHash('md5').update(`${merchantCode}${latestTrx.amount}${latestTrx.merchant_order_id}${merchantKey}`).digest('hex'),
                resultCode: '00'
              }).toString()
            });
          } catch (e) {
            console.error('Failed to trigger callback in check route:', e);
          }

          return NextResponse.json({ success: true, status: 'ACTIVE' });
        }
      }

      return NextResponse.json({ success: true, status: 'PENDING' });
    }

    return NextResponse.json({ success: true, status: 'ACTIVE' });

  } catch (error: any) {
    console.error('Check Status Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
