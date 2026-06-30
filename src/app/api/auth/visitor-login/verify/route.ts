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
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email dan OTP diperlukan.' }, { status: 400 });
    }

    // 1. Verifikasi OTP
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return NextResponse.json({ error: 'Kode OTP salah atau sudah kadaluarsa.' }, { status: 400 });
    }

    // 2. Ambil data member aktif berdasarkan email
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, name, email, group_id, role, status')
      .eq('email', email)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Akun tidak ditemukan atau tidak aktif.' }, { status: 404 });
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

    // 5. Generate JWT visitor token (berlaku 7 hari)
    const token = await new SignJWT({
      memberId: member.id,
      groupId: member.group_id,
      email: member.email,
      role: 'VISITOR',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .setSubject(member.id)
      .sign(getJwtSecretKey());

    // 6. Set cookie dan return response
    const response = NextResponse.json({
      success: true,
      redirect: hasMissingFace ? '/face-setup' : '/dashboard',
      member: { name: member.name, email: member.email },
    });

    response.cookies.set({
      name: 'visitor_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;
  } catch (err) {
    console.error('Visitor Login Verify Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
