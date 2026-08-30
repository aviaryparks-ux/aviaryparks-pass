import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getVisitorFromRequest, unauthorizedResponse } from '@/lib/visitorAuth';

// ── SECURITY: This endpoint now requires visitor authentication
// Only the owner of the group can fetch their pending members
export async function POST(request: NextRequest) {
  try {
    const { groupId } = await request.json();

    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    }

    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(groupId);

    if (!isUUID) {
      return NextResponse.json({ error: 'Format ID tidak valid' }, { status: 400 });
    }

    // Cari member berdasarkan group_id atau id
    let { data, error } = await supabaseAdmin
      .from('members')
      .select('id, name, status, face_descriptor, group_id')
      .or(`group_id.eq.${groupId},id.eq.${groupId}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch Pending Members Error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch members' }, { status: 500 });
    }

    // Jika pencarian menggunakan id member perorangan, ambil seluruh anggota keluarganya jika ada
    if (data && data.length === 1 && data[0].group_id && data[0].group_id !== groupId) {
      const familyRes = await supabaseAdmin
        .from('members')
        .select('id, name, status, face_descriptor, group_id')
        .eq('group_id', data[0].group_id)
        .order('created_at', { ascending: true });
      if (familyRes.data && familyRes.data.length > 0) {
        data = familyRes.data;
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Fetch Pending Members Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch members' }, { status: 500 });
  }
}
