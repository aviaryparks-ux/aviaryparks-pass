import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // Duitku callback uses application/x-www-form-urlencoded
    const text = await request.text();
    const params = new URLSearchParams(text);
    
    const merchantCode = params.get('merchantCode');
    const amount = params.get('amount');
    const merchantOrderId = params.get('merchantOrderId');
    const signature = params.get('signature');
    const reference = params.get('reference');
    const resultCode = params.get('resultCode');

    if (!merchantCode || !amount || !merchantOrderId || !signature) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const myMerchantCode = process.env.NEXT_PUBLIC_DUITKU_MERCHANT_CODE || '';
    const myMerchantKey = process.env.DUITKU_MERCHANT_KEY || '';

    // Duitku Callback Signature: MD5(merchantCode + amount + merchantOrderId + merchantKey)
    const expectedSignatureStr = `${myMerchantCode}${amount}${merchantOrderId}${myMerchantKey}`;
    const expectedSignature = crypto.createHash('md5').update(expectedSignatureStr).digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid signature in callback', { signature, expectedSignature });
      return NextResponse.json({ error: 'Bad Signature' }, { status: 400 });
    }

    // resultCode "00" indicates success
    if (resultCode === '00') {
      console.log(`Payment Success for order: ${merchantOrderId}`);
      
      // Update member status in Supabase
      const { error } = await supabase
        .from('members')
        .update({ 
          status: 'ACTIVE',
          activation_date: new Date().toISOString()
        })
        .eq('group_id', merchantOrderId);

      if (error) {
        console.error('Failed to update member status in Supabase:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

    } else {
      console.log(`Payment Failed or Pending for order: ${merchantOrderId}, ResultCode: ${resultCode}`);
      // Depending on resultCode, you might want to mark it as Failed.
      // But for PENDING_PAYMENT we can just leave it as is.
    }

    // Duitku expects HTTP 200 OK
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Payment Callback Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
