import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('visits')
      .select('visited_at, member_id')
      .order('visited_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching admin visits:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch visits' }, { status: 500 });
  }
}
