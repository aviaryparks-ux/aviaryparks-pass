import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email tidak valid.' }, { status: 400 });
    }

    if (!phone || phone.length < 9) {
      return NextResponse.json({ error: 'Nomor WhatsApp tidak valid.' }, { status: 400 });
    }

    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';

    // IP-based Rate limit check: Maksimal 3 request per IP dalam 1 jam (tahan bot brute force)
    if (ipAddress !== 'unknown') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: ipOtps } = await supabaseAdmin
        .from('email_otps')
        .select('id')
        .eq('ip_address', ipAddress)
        .gte('created_at', oneHourAgo);

      if (ipOtps && ipOtps.length >= 3) {
        return NextResponse.json(
          { error: 'Terlalu banyak permintaan dari perangkat/WiFi Anda. Harap tunggu 1 jam.' },
          { status: 429 }
        );
      }
    }

    // Email-based Rate limit check: Cek apakah email ini sudah minta OTP dalam 60 detik terakhir
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentOtp } = await supabaseAdmin
      .from('email_otps')
      .select('created_at')
      .eq('email', email)
      .gte('created_at', oneMinuteAgo)
      .limit(1);

    if (recentOtp && recentOtp.length > 0) {
      return NextResponse.json(
        { error: 'Harap tunggu 60 detik sebelum meminta OTP baru.' },
        { status: 429 }
      );
    }

    // Hapus OTP lama untuk email ini
    await supabaseAdmin.from('email_otps').delete().eq('email', email);

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    // Simpan OTP ke database
    const { error: dbError } = await supabaseAdmin.from('email_otps').insert({
      email, // we keep using email as the identifier in DB for registration
      otp,
      expires_at: expiresAt.toISOString(),
      used: false,
      ip_address: ipAddress,
    });

    if (dbError) {
      console.error('DB Error:', dbError);
      return NextResponse.json({ error: 'Gagal menyimpan OTP.' }, { status: 500 });
    }

    // Kirim OTP via WhatsApp
    const waMessage = `*Aviary Park Indonesia*\n\nHalo,\n\nTerima kasih telah mendaftar Annual Pass Aviary Park. Berikut adalah kode verifikasi (OTP) pendaftaran Anda:\n\n*${otp}*\n\nKode ini berlaku selama 10 menit. Jangan berikan kode ini kepada siapa pun!`;
    
    let targetWa = phone.replace(/[^0-9]/g, '');
    if (targetWa.startsWith('0')) {
      targetWa = '62' + targetWa.slice(1);
    }
    
    const sent = await sendWhatsAppMessage(targetWa, waMessage);
    
    if (!sent) {
      return NextResponse.json({ error: 'Gagal mengirim pesan WhatsApp. Pastikan nomor valid.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'OTP terkirim ke WhatsApp Anda.' });
  } catch (err) {
    console.error('Send OTP Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
