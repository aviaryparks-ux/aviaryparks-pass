import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { groupId, amount, customerName, customerEmail, customerPhone, paymentMethod } = body;

    if (!groupId || !amount || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const merchantCode = process.env.NEXT_PUBLIC_DUITKU_MERCHANT_CODE || '';
    const merchantKey = process.env.DUITKU_MERCHANT_KEY || '';
    const isSandbox = process.env.DUITKU_ENV === 'sandbox';

    // MD5(merchantCode + merchantOrderId + paymentAmount + merchantKey)
    const signatureString = `${merchantCode}${groupId}${amount}${merchantKey}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    // Duitku API endpoint
    const endpoint = isSandbox
      ? 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry'
      : 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry';

    // Use a default callback URL if not set, but warn the user.
    // Duitku might require HTTPS for callback URL even in sandbox.
    const callbackUrl = process.env.DUITKU_CALLBACK_URL || 'https://www.aviarypark-test.com/api/payment/callback';
    
    // We get the origin from the request so the returnUrl goes back to localhost for testing
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const returnUrl = `${origin}/face-setup`;

    const payload = {
      merchantCode,
      paymentAmount: amount,
      paymentMethod,
      merchantOrderId: groupId,
      productDetails: 'Tiket Aviary Park',
      email: customerEmail || 'no-email@example.com',
      customerVaName: customerName || 'Pelanggan Aviary Park',
      phoneNumber: customerPhone || '081234567890',
      itemDetails: [
        {
          name: 'Paket Tiket Aviary Park',
          price: amount,
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
      return NextResponse.json({
        success: true,
        paymentUrl: data.paymentUrl,
        reference: data.reference
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
