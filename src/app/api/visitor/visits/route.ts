import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getVisitorFromRequest, unauthorizedResponse } from '@/lib/visitorAuth';

export async function GET(request: NextRequest) {
  try {
    const visitor = await getVisitorFromRequest(request);
    if (!visitor) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const memberIds = searchParams.get('member_ids'); // comma separated

    if (!memberIds) {
      return NextResponse.json({ success: false, error: 'member_ids is required' }, { status: 400 });
    }

    const ids = memberIds.split(',');

    // Verify Ownership: ensure all requested member IDs belong to the visitor's group
    const { data: validMembers, error: valErr } = await supabaseAdmin
      .from('members')
      .select('id')
      .in('id', ids)
      .eq('group_id', visitor.groupId);
      
    if (valErr || !validMembers || validMembers.length !== ids.length) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('visits')
      .select('*')
      .in('member_id', ids)
      .order('visited_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching visits:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch visits' }, { status: 500 });
  }
}
