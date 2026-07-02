import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');
    
    // 1. Fetch active rewards catalog
    const { data: rewards, error: rError } = await supabaseAdmin
      .from('rewards_catalog')
      .select('*')
      .eq('is_active', true)
      .order('points_required', { ascending: true });

    if (rError) throw rError;

    let mutations: any[] = [];
    
    // 2. Fetch point mutations if member_id is provided
    if (memberId) {
      const { data: mData, error: mError } = await supabaseAdmin
        .from('point_mutations')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });
        
      if (mError) throw mError;
      mutations = mData || [];
    }

    return NextResponse.json({ success: true, data: { rewards, mutations } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
