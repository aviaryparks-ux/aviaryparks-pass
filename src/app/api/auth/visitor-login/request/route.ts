import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 15000, // 15 detik batas waktu
});

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });
    }

    // Cek apakah email terdaftar sebagai member yang sudah AKTIF
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, email, name, status')
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'ACTIVE')
      .limit(1)
      .single();

    if (memberError || !member) {
      return NextResponse.json({
        error: 'Email tidak ditemukan atau akun belum aktif. Pastikan pembayaran sudah selesai.',
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

    // Email-based rate limit
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentOtp } = await supabaseAdmin
      .from('email_otps')
      .select('created_at')
      .eq('email', email)
      .gte('created_at', oneMinuteAgo)
      .limit(1);

    if (recentOtp && recentOtp.length > 0) {
      return NextResponse.json({ error: 'Harap tunggu 60 detik sebelum meminta kode baru.' }, { status: 429 });
    }

    // Hapus OTP lama dan buat yang baru
    await supabaseAdmin.from('email_otps').delete().eq('email', email);

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    const { error: insertError } = await supabaseAdmin.from('email_otps').insert({
      email,
      otp,
      expires_at: expiresAt.toISOString(),
      used: false,
      ip_address: ipAddress,
    });
    
    if (insertError) {
      console.error('Error inserting OTP:', insertError);
      return NextResponse.json({ error: 'Terjadi kesalahan saat membuat kode OTP (Cek tabel email_otps di database).' }, { status: 500 });
    }

    // Kirim email OTP login via Nodemailer
    try {
      await transporter.sendMail({
        from: `"Aviary Park" <${process.env.EMAIL_USER}>`,
        to: email, 
        subject: `Kode Masuk Aviary Park — ${otp}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #f0fdf4; padding: 2rem; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 2rem;">
              <h1 style="color: #064e3b; font-size: 1.4rem; font-weight: 800; margin: 0 0 0.25rem 0;">Aviary Park Indonesia</h1>
              <p style="color: #64748b; font-size: 0.9rem; margin: 0;">Member Dashboard Access</p>
            </div>
            <div style="background: white; border-radius: 12px; padding: 2rem; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
              <p style="color: #334155; margin-bottom: 0.5rem; font-size: 1rem;">Halo <strong>${member.name}</strong>,</p>
              <p style="color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem;">Gunakan kode berikut untuk masuk ke Dashboard Anda:</p>
              <div style="background: #064e3b; color: white; font-size: 2.5rem; font-weight: 800; letter-spacing: 0.5rem; padding: 1rem 2rem; border-radius: 12px; display: inline-block; margin-bottom: 1.5rem;">
                ${otp}
              </div>
              <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Kode ini berlaku selama <strong>10 menit</strong>.</p>
              <p style="color: #94a3b8; font-size: 0.8rem; margin-top: 0.5rem;">Jangan bagikan kode ini kepada siapapun.</p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Nodemailer Error:', emailError);
      return NextResponse.json({ error: 'Gagal mengirim email OTP. Silakan coba lagi.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Kode verifikasi telah dikirim ke email Anda.' });
  } catch (err) {
    console.error('Visitor Login Request Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
