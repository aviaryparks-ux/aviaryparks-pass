import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) {
      return NextResponse.json({ error: 'Missing member ID' }, { status: 400 });
    }

    // We will save all fields sent by the client
    // Since the database will have these columns now
    delete updates.role;
    delete updates.group_id;
    delete updates.face_descriptor;

    const { error } = await supabaseAdmin
      .from('members')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Profile Update Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
