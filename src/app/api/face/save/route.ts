import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { memberId, descriptorArray } = await request.json();

    if (!memberId || !descriptorArray) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Hardening: Verify member state before updating
    // Since this endpoint is hit before the user is fully logged in (no JWT),
    // we must prevent overwriting existing faces to mitigate IDOR.
    const { data: member, error: checkErr } = await supabaseAdmin
      .from('members')
      .select('status, face_descriptor')
      .eq('id', memberId)
      .single();

    if (checkErr || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Cannot register face for unpaid/inactive member' }, { status: 403 });
    }

    if (member.face_descriptor !== null && member.face_descriptor.length > 0) {
      return NextResponse.json({ error: 'Face biometrics already registered. Cannot overwrite.' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('members')
      .update({ face_descriptor: descriptorArray })
      .eq('id', memberId);

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save Face Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
