import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { groupId } = await request.json();

    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    }

    const merchantCode = process.env.NEXT_PUBLIC_DUITKU_MERCHANT_CODE || '';
    const merchantKey = process.env.DUITKU_MERCHANT_KEY || '';
    const isSandbox = process.env.DUITKU_ENV === 'sandbox';

    // Signature: MD5(merchantCode + merchantOrderId + merchantKey)
    const signatureString = `${merchantCode}${groupId}${merchantKey}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    const endpoint = isSandbox
      ? 'https://sandbox.duitku.com/webapi/api/merchant/transactionStatus'
      : 'https://passport.duitku.com/webapi/api/merchant/transactionStatus';

    const payload = {
      merchantCode,
      merchantOrderId: groupId,
      signature
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.statusCode === '00') {
      // Payment is success, update DB
      const { error } = await supabase
        .from('members')
        .update({ 
          status: 'ACTIVE',
          activation_date: new Date().toISOString()
        })
        .eq('group_id', groupId);

      if (error) {
        return NextResponse.json({ success: false, error: 'Failed to update database' }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'ACTIVE' });
    }

    return NextResponse.json({ success: true, status: 'PENDING' });

  } catch (error: any) {
    console.error('Check Status Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
