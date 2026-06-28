import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email tidak valid.' }, { status: 400 });
    }

    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';

    // IP-based Rate limit check: Maksimal 3 request per IP dalam 1 jam (tahan bot brute force)
    if (ipAddress !== 'unknown') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: ipOtps } = await supabase
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
    const { data: recentOtp } = await supabase
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
    await supabase.from('email_otps').delete().eq('email', email);

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    // Simpan OTP ke database
    const { error: dbError } = await supabase.from('email_otps').insert({
      email,
      otp,
      expires_at: expiresAt.toISOString(),
      used: false,
      ip_address: ipAddress,
    });

    if (dbError) {
      console.error('DB Error:', dbError);
      return NextResponse.json({ error: 'Gagal menyimpan OTP.' }, { status: 500 });
    }

    // Kirim email via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'Aviary Park <onboarding@resend.dev>',
      to: [email],
      subject: 'Kode Verifikasi Aviary Park - ' + otp,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #f0fdf4; padding: 2rem; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 2rem;">
            <h1 style="color: #064e3b; font-size: 1.4rem; font-weight: 800; margin: 0 0 0.25rem 0;">Aviary Park Indonesia</h1>
            <p style="color: #64748b; font-size: 0.9rem; margin: 0;">Annual Pass Registration</p>
          </div>

          <div style="background: white; border-radius: 12px; padding: 2rem; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <p style="color: #334155; margin-bottom: 1rem; font-size: 1rem;">Kode verifikasi email Anda:</p>
            <div style="background: #064e3b; color: white; font-size: 2.5rem; font-weight: 800; letter-spacing: 0.5rem; padding: 1rem 2rem; border-radius: 12px; display: inline-block; margin-bottom: 1.5rem;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Kode ini berlaku selama <strong>10 menit</strong>.</p>
            <p style="color: #94a3b8; font-size: 0.8rem; margin-top: 0.5rem;">Jangan bagikan kode ini kepada siapapun.</p>
          </div>

          <p style="text-align: center; color: '#94a3b8'; font-size: 0.75rem; margin-top: 1.5rem;">
            Jika Anda tidak merasa mendaftar ke Aviary Park, abaikan email ini.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Email Error:', emailError);
      return NextResponse.json({ error: 'Gagal mengirim email.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'OTP terkirim ke email Anda.' });
  } catch (err) {
    console.error('Send OTP Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
