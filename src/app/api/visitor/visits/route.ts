import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberIds = searchParams.get('member_ids'); // comma separated

    if (!memberIds) {
      return NextResponse.json({ success: false, error: 'member_ids is required' }, { status: 400 });
    }

    const ids = memberIds.split(',');

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
