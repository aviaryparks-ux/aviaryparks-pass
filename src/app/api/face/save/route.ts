import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { memberId, descriptorArray } = await request.json();

    if (!memberId || !descriptorArray) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
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
