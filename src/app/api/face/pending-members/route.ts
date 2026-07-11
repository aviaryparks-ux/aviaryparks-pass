import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getVisitorFromRequest, unauthorizedResponse } from '@/lib/visitorAuth';

// ── SECURITY: This endpoint now requires visitor authentication
// Only the owner of the group can fetch their pending members
export async function POST(request: NextRequest) {
  try {
    // ── SECURITY: Require visitor authentication ──
    const visitor = await getVisitorFromRequest(request);
    if (!visitor) return unauthorizedResponse();

    const { groupId } = await request.json();

    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    }

    // ── SECURITY: Verify the requested groupId belongs to the visitor ──
    if (groupId !== visitor.groupId) {
      return NextResponse.json({ error: 'Forbidden: You can only access your own group' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('members')
      .select('id, name, status, face_descriptor')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch Pending Members Error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch members' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Fetch Pending Members Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch members' }, { status: 500 });
  }
}
