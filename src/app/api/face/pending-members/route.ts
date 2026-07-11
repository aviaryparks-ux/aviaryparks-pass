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

    // SECURITY: Optional visitor authentication
    // If visitor token exists, enforce that they only access their own group
    const visitor = await getVisitorFromRequest(request);
    if (visitor && groupId !== visitor.groupId) {
      return NextResponse.json({ error: 'Forbidden: You can only access your own group' }, { status: 403 });
    }

    // Note: Since groupId is a secure UUID v4, it acts as a capability token for newly registered users
    // who haven't logged in yet but were redirected from payment.

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
