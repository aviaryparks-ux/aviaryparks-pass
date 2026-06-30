import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { nik, excludeNik } = await req.json();

    if (!nik) {
      return NextResponse.json({ error: 'NIK diperlukan.' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('members')
      .select('id')
      .eq('nik', nik)
      .limit(1);

    // Jika excludeNik diberikan (misal saat edit profil),
    // abaikan record yang NIK-nya sama dengan yang sedang diedit
    if (excludeNik) {
      query = query.neq('nik', excludeNik);
    }

    const { data } = await query;
    const exists = data && data.length > 0;

    return NextResponse.json({ exists });
  } catch (err) {
    console.error('Check NIK Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

