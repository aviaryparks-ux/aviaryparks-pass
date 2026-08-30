import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('wahanas')
      .select('id, name, category, is_active')
      .order('name', { ascending: true });

    if (error) {
      console.error('Database query error in gate/wahanas:', error);
      return NextResponse.json([]);
    }
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching wahanas for gate:', error);
    return NextResponse.json([]);
  }
}