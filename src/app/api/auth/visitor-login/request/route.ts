import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Nomor telepon tidak valid.' }, { status: 400 });
    }

    // Hanya hapus karakter non-angka
    let cleanPhone = phone.replace(/[^0-9]/g, '');

    // Cari member aktif dengan nomor telepon yang cocok (cek cleanPhone atau versi 62/0 nya)
    let altPhone = cleanPhone;
    if (cleanPhone.startsWith('0')) {
      altPhone = '62' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('62')) {
      altPhone = '0' + cleanPhone.slice(2);
    }

    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, phone, name, status')
      .or(`phone.eq.${cleanPhone},phone.eq.${altPhone}`)
      .eq('status', 'ACTIVE')
      .limit(1)
      .single();

    if (memberError || !member) {
      return NextResponse.json({
        error: 'Nomor WhatsApp tidak ditemukan atau akun belum aktif. Pastikan pembayaran sudah selesai.',
      }, { status: 404 });
    }

    // IP-based rate limit
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';

    if (ipAddress !== 'unknown') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: ipOtps } = await supabaseAdmin
        .from('email_otps')
        .select('id')
        .eq('ip_address', ipAddress)
        .gte('created_at', oneHourAgo);

      if (ipOtps && ipOtps.length >= 5) {
        return NextResponse.json({ error: 'Terlalu banyak permintaan dari perangkat ini. Harap tunggu 1 jam.' }, { status: 429 });
      }
    }

    // Phone-based rate limit (We use the 'email' column to store phone number)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentOtp } = await supabaseAdmin
      .from('email_otps')
      .select('created_at')
      .eq('email', member.phone)
      .gte('created_at', oneMinuteAgo)
      .limit(1);

    if (recentOtp && recentOtp.length > 0) {
      return NextResponse.json({ error: 'Harap tunggu 60 detik sebelum meminta kode baru.' }, { status: 429 });
    }

    // Hapus OTP lama dan buat yang baru
    await supabaseAdmin.from('email_otps').delete().eq('email', member.phone);

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    const { error: insertError } = await supabaseAdmin.from('email_otps').insert({
      email: member.phone, // Menyimpan nomor WA di kolom email
      otp,
      expires_at: expiresAt.toISOString(),
      used: false,
      ip_address: ipAddress,
    });
    
    if (insertError) {
      console.error('Error inserting OTP:', insertError);
      return NextResponse.json({ error: 'Terjadi kesalahan saat membuat kode OTP.' }, { status: 500 });
    }

    // Kirim WA OTP via Fonnte
    const waMessage = `*Aviary Park Indonesia*\n\nHalo *${member.name}*,\n\nBerikut adalah kode rahasia (OTP) untuk masuk ke Dasbor Pengunjung Anda:\n\n*${otp}*\n\nKode ini berlaku selama 10 menit. Jangan berikan kode ini kepada siapa pun!`;
    
    let targetWa = member.phone;
    if (targetWa.startsWith('0')) {
      targetWa = '62' + targetWa.slice(1);
    }
    const sent = await sendWhatsAppMessage(targetWa, waMessage);
    
    if (!sent) {
      return NextResponse.json({ error: 'Gagal mengirim pesan WhatsApp. Pastikan token Fonnte valid.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Kode verifikasi telah dikirim ke WhatsApp Anda.' });
  } catch (err) {
    console.error('Visitor Login Request Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
