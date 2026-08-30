import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url || 'http://localhost');
    const category = searchParams.get('category') || 'MEMBERSHIP';

    let query = supabaseAdmin
      .from('ticket_packages')
      .select('*, package_wahanas(wahana_id, quantity, wahanas(name))')
      .eq('is_active', true);

    if (category === 'BUNDLING' || category === 'TOPUP_BUNDLE') {
      query = query.or('category.eq.TOPUP_BUNDLE,category.eq.BUNDLING');
    } else {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('price', { ascending: true });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching packages:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch packages' }, { status: 500 });
  }
}
