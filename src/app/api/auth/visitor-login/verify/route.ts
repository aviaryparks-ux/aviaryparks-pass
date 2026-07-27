import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
};

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Nomor WhatsApp dan OTP diperlukan.' }, { status: 400 });
    }
    
    let cleanPhone = phone.replace(/[^0-9]/g, '');

    let altPhone = cleanPhone;
    if (cleanPhone.startsWith('0')) {
      altPhone = '62' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('62')) {
      altPhone = '0' + cleanPhone.slice(2);
    }

    // 1. Ambil data member aktif berdasarkan phone (karena email_otps pake member.phone saat insert)
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, name, email, phone, group_id, role, status')
      .or(`phone.eq.${cleanPhone},phone.eq.${altPhone}`)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Akun tidak ditemukan atau tidak aktif.' }, { status: 404 });
    }

    // 2. Verifikasi OTP (menggunakan kolom 'email' yang diisi dengan member.phone)
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('email_otps')
      .select('*')
      .eq('email', member.phone)
      .eq('otp', otp)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return NextResponse.json({ error: 'Kode OTP salah atau sudah kadaluarsa.' }, { status: 400 });
    }

    // 3. Tandai OTP sebagai sudah digunakan
    await supabaseAdmin.from('email_otps').update({ used: true }).eq('id', otpData.id);

    // 4. Cek apakah ada anggota grup yang belum setup wajah
    const { data: groupMembers } = await supabaseAdmin
      .from('members')
      .select('id, face_descriptor, status')
      .eq('group_id', member.group_id)
      .eq('status', 'ACTIVE');

    const hasMissingFace = groupMembers?.some((m) => !m.face_descriptor);

    // 5. Generate JWT visitor token (reduced from 7d to 3d for better security)
    const token = await new SignJWT({
      memberId: member.id,
      groupId: member.group_id,
      email: member.email || member.phone,
      role: 'VISITOR',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('72h') // 3 days
      .setSubject(member.id)
      .sign(getJwtSecretKey());

    // 6. Set cookie dan return response
    const response = NextResponse.json({
      success: true,
      redirect: hasMissingFace ? '/face-setup' : '/dashboard',
      member: { name: member.name, phone: member.phone },
    });

    response.cookies.set({
      name: 'visitor_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_BASE_URL?.startsWith('https'),
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 3, // 3 hari
    });

    return response;
  } catch (err) {
    console.error('Visitor Login Verify Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
