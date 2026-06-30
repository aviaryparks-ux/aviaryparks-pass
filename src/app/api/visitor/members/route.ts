import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getVisitorFromRequest, unauthorizedResponse } from '@/lib/visitorAuth';

export async function GET(request: NextRequest) {
  try {
    const visitor = await getVisitorFromRequest(request);
    if (!visitor) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const groupId = searchParams.get('group_id');
    const single = searchParams.get('single') === 'true';

    // Verify Ownership
    if (groupId && groupId !== visitor.groupId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    let query = supabaseAdmin.from('members').select('*');

    if (id) {
      // We must ensure the requested 'id' also belongs to the visitor's group
      query = query.eq('id', id).eq('group_id', visitor.groupId);
    } else if (groupId) {
      query = query.eq('group_id', groupId).order('created_at', { ascending: true });
    } else {
      return NextResponse.json({ success: false, error: 'id or group_id is required' }, { status: 400 });
    }

    if (single) {
      const { data, error } = await query.limit(1).single();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    } else {
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }
  } catch (error: any) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const members = await request.json();
    
    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid members data' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from('members').insert(members).select();
    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error inserting members:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to insert members' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, updates } = await request.json();
    
    if (!id || !updates) {
      return NextResponse.json({ success: false, error: 'id and updates are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from('members').update(updates).eq('id', id).select();
    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating member:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update member' }, { status: 500 });
  }
}
