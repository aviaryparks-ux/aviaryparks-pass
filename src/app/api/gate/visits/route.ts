import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { member_id, location } = await request.json();
    // Sebelumnya ada aturan '1 Hari = 1 Kunjungan' di sini yang memblokir
    // pencatatan history jika Anda sudah pernah masuk di hari yang sama.
    // Aturan tersebut sudah saya hapus agar setiap Anda melakukan Live Scan, 
    // sistem selalu mencatatnya (selama lewat dari cooldown 60 detik di aplikasi Gate).

    const { data, error } = await supabaseAdmin.from('visits').insert([{ member_id, status: 'SUCCESS' }]).select();
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Gate Visits Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to record visit' }, { status: 500 });
  }
}
