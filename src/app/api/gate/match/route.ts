import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { descriptorArray } = await request.json();

    if (!descriptorArray || !Array.isArray(descriptorArray) || descriptorArray.length !== 128) {
      return NextResponse.json({ error: 'Invalid descriptor' }, { status: 400 });
    }

    // Format array ke string pgvector
    const vectorString = `[${descriptorArray.join(',')}]`;

    // 1. Panggil RPC match_face (Threshold 0.96)
    const { data: matches, error: rpcErr } = await supabaseAdmin.rpc('match_face', {
      query_embedding: vectorString,
      match_threshold: 0.96,
      match_count: 1
    });

    if (rpcErr) {
      console.error('RPC Error:', rpcErr);
      return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ data: null });
    }

    const memberId = matches[0].id;

    // 2. Ambil data member utama (Hanya kolom yang dibutuhkan tampilan gate agar payload ringan)
    const { data: matchedMember, error: mErr } = await supabaseAdmin
      .from('members')
      .select('id, name, nik, role, status, group_id, activation_date, photo_url, phone')
      .eq('id', memberId)
      .single();

    if (mErr || !matchedMember) {
      return NextResponse.json({ data: null });
    }

    // 3. Ambil data keluarga segrup (Ringan & Cepat)
    let familyData: any[] = [];
    if (matchedMember.group_id) {
      const { data: fData } = await supabaseAdmin
        .from('members')
        .select('id, name, nik, role, status, photo_url')
        .eq('group_id', matchedMember.group_id)
        .neq('id', memberId);
      if (fData) familyData = fData;
    }

    return NextResponse.json({ data: matchedMember, family: familyData });

  } catch (error: any) {
    console.error('Match Face Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
