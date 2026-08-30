import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// GET all wahanas for POS & Gate Scanner
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('wahanas')
      .select('id, name, category, is_active')
      .order('name', { ascending: true });

    if (error) {
      console.error('Database query error in wahanas:', error);
      return NextResponse.json([]);
    }
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching wahanas for pos:', error);
    return NextResponse.json([]);
  }
}
