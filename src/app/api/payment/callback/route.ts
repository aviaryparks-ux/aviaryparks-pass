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

      const { data: existingTx } = await supabaseAdmin
        .from('transactions')
        .select('status')
        .eq('merchant_order_id', merchantOrderId)
        .single();

      if (existingTx?.status === 'SUCCESS') {
        console.log(`Order ${merchantOrderId} already processed, skipping.`);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('transactions')
        .update({ status: 'SUCCESS' })
        .eq('merchant_order_id', merchantOrderId);

      if (updateError) {
        console.error('Failed to update transaction status:', updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      const actualGroupId = merchantOrderId.split('-').slice(0, 5).join('-');

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

      try {
        const { data: member } = await supabaseAdmin.from('members').select('phone, name').eq('group_id', actualGroupId).eq('role', 'PRIMARY').single();
        const { data: trx } = await supabaseAdmin.from('transactions').select('amount, package_name').eq('merchant_order_id', merchantOrderId).single();
        
        if (member && member.phone) {
          const packageName = trx?.package_name || 'Tiket Aviary Park';
          const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(trx?.amount || 0);
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
