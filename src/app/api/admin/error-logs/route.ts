import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100); // Fetch top 100 recent errors

    if (error) {
      console.error('Failed to fetch error logs:', error);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
