import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { nik, excludeNik } = await req.json();

    if (!nik) {
      return NextResponse.json({ error: 'NIK diperlukan.' }, { status: 400 });
    }

    let query = supabase
      .from('members')
      .select('id')
      .eq('nik', nik)
      .limit(1);

    const { data } = await query;
    const exists = data && data.length > 0;

    return NextResponse.json({ exists });
  } catch (err) {
    console.error('Check NIK Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
