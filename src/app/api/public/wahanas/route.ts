import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('wahanas')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching public wahanas:', error);
      return NextResponse.json({ success: false, data: [] });
    }
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    console.error('Error in public wahanas:', err);
    return NextResponse.json({ success: false, data: [] });
  }
}