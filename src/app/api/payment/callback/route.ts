import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPaymentReceiptEmail } from '@/lib/email';

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
      
      // Update transaction status
      await supabaseAdmin.from('transactions').update({ status: 'SUCCESS' }).eq('merchant_order_id', merchantOrderId);

      // Parse groupId from uniqueOrderId (format: groupId-timestamp)
      // Since groupId is a UUID (contains dashes), we must take the first 5 segments
      const actualGroupId = merchantOrderId.split('-').slice(0, 5).join('-');

      // Update member status in Supabase using Admin client to bypass RLS
      // Hanya update anggota yang statusnya PENDING_PAYMENT (supaya ACTIVE yg lama tidak tertimpa tgl aktivasinya)
      const { error } = await supabaseAdmin
        .from('members')
        .update({ 
          status: 'ACTIVE',
          activation_date: new Date().toISOString()
        })
        .eq('group_id', actualGroupId)
        .eq('status', 'PENDING_PAYMENT');

      if (error) {
        console.error('Failed to update member status in Supabase:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      // Send email (MUST BE AWAITED so serverless function doesn't die)
      try {
        const { data: member } = await supabaseAdmin.from('members').select('email, name, package_id').eq('group_id', actualGroupId).eq('role', 'PRIMARY').single();
        if (member && member.email) {
          let packageName = 'Annual Pass';
          if (member.package_id) {
            const { data: pkg } = await supabaseAdmin.from('ticket_packages').select('name').eq('id', member.package_id).single();
            if (pkg) packageName = pkg.name;
          }
          await sendPaymentReceiptEmail(member.email, member.name, actualGroupId, packageName);
        }
      } catch (err) {
        console.error('Failed to send email:', err);
      }

    } else {
      console.log(`Payment Failed or Pending for order: ${merchantOrderId}, ResultCode: ${resultCode}`);
      // Mark transaction as failed if it's not success (or handle pending differently if needed)
      await supabaseAdmin.from('transactions').update({ status: 'FAILED' }).eq('merchant_order_id', merchantOrderId);
    }

    // Duitku expects HTTP 200 OK
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Payment Callback Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
