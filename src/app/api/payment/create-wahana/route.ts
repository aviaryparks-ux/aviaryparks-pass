import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memberId, wahanaId, bundleId, quantity = 1, customerName, customerEmail, customerPhone, paymentMethod } = body;

    if (!memberId || (!wahanaId && !bundleId) || paymentMethod === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let secureAmount = 0;
    let productName = '';
    let productDesc = '';
    let trxPackageName = '';
    let uniqueOrderId = '';
    const shortMemberId = memberId.split('-')[0];

    const parsedQty = Math.max(1, parseInt(String(quantity), 10) || 1);

    if (bundleId) {
      // 1A. Informasi Paket Bundling
      const { data: bundle, error: bErr } = await supabaseAdmin
        .from('ticket_packages')
        .select('name, price, package_wahanas(wahana_id, quantity, wahanas(name))')
        .eq('id', bundleId)
        .eq('is_active', true)
        .single();

      if (bErr || !bundle) {
        return NextResponse.json({ error: 'Paket bundling tidak ditemukan atau tidak aktif' }, { status: 404 });
      }

      secureAmount = Math.round(Number(bundle.price) * parsedQty);
      productName = `Paket Bundling ${bundle.name}`;
      productDesc = `Top-Up ${parsedQty}x ${bundle.name}`;
      trxPackageName = `BUNDLE_TOPUP|${bundleId}|${parsedQty}|${bundle.name}`;
      const shortBundleId = bundleId.split('-')[0];
      uniqueOrderId = `BUNDLE-${shortMemberId}-${shortBundleId}-${parsedQty}-${Date.now()}`;
    } else {
      // 1B. Dapatkan informasi wahana satuan
      const { data: wahana, error: wahanaErr } = await supabaseAdmin
        .from('wahanas')
        .select('name, topup_price')
        .eq('id', wahanaId)
        .eq('is_active', true)
        .single();

      if (wahanaErr || !wahana) {
        return NextResponse.json({ error: 'Wahana tidak ditemukan atau tidak aktif' }, { status: 404 });
      }

      secureAmount = Math.round(Number(wahana.topup_price) * parsedQty);
      productName = `Tiket Wahana ${wahana.name}`;
      productDesc = `Top-Up ${parsedQty}x ${wahana.name}`;
      trxPackageName = `WAHANA_TOPUP|${wahanaId}|${parsedQty}|${wahana.name}`;
      const shortWahanaId = wahanaId.split('-')[0];
      uniqueOrderId = `WAHANA-${shortMemberId}-${shortWahanaId}-${parsedQty}-${Date.now()}`;
    }

    if (secureAmount <= 0) {
      return NextResponse.json({ error: 'Total pembayaran tidak valid' }, { status: 400 });
    }

    const merchantCode = process.env.NEXT_PUBLIC_DUITKU_MERCHANT_CODE || '';
    const merchantKey = process.env.DUITKU_MERCHANT_KEY || '';
    const isSandbox = process.env.DUITKU_ENV === 'sandbox';

    const totalAmountInt = Math.round(secureAmount);
    const unitPrice = Math.round(totalAmountInt / parsedQty);

    // MD5(merchantCode + merchantOrderId + paymentAmount + merchantKey)
    const signatureString = `${merchantCode}${uniqueOrderId}${totalAmountInt}${merchantKey}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    // Duitku API endpoint
    const endpoint = isSandbox
      ? 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry'
      : 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry';

    const callbackUrl = process.env.DUITKU_CALLBACK_URL || 'https://www.aviarypark-test.com/api/payment/callback';
    
    // Gunakan NEXT_PUBLIC_BASE_URL dari env, atau Origin header sebagai fallback
    const origin = request.headers.get('origin');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/dashboard`; // Kembalikan ke dashboard

    const payload = {
      merchantCode,
      paymentAmount: totalAmountInt,
      paymentMethod,
      merchantOrderId: uniqueOrderId,
      productDetails: productDesc,
      email: customerEmail || 'no-email@example.com',
      customerVaName: customerName || 'Pelanggan Aviary Park',
      phoneNumber: customerPhone || '081234567890',
      itemDetails: [
        {
          name: productName,
          price: totalAmountInt,
          quantity: 1
        }
      ],
      customerDetail: {
        firstName: customerName || 'Pelanggan',
        lastName: 'Aviary Park',
        email: customerEmail || 'no-email@example.com',
        phoneNumber: customerPhone || '081234567890'
      },
      callbackUrl,
      returnUrl,
      signature,
      expiryPeriod: 60 // 60 minutes
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.statusCode === '00') {
      const { error: trxError } = await supabaseAdmin.from('transactions').insert({
        group_id: memberId, 
        merchant_order_id: uniqueOrderId,
        buyer_name: customerName || 'Pelanggan',
        package_name: trxPackageName,
        amount: secureAmount,
        status: 'PENDING',
        payment_method: paymentMethod
      });
      
      if (trxError) console.error("Error creating transaction record:", trxError);

      return NextResponse.json({
        success: true,
        paymentUrl: data.paymentUrl,
        reference: data.reference,
        qrString: data.qrString || null,
        merchantOrderId: uniqueOrderId
      });
    } else {
      console.error('Duitku Error Response:', data);
      return NextResponse.json({
        success: false,
        error: data.statusMessage,
        details: data
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Payment Create Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
