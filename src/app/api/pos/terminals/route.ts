import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('pos_terminals')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (error) {
      // Fallback if table doesn't exist yet
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          data: [
            { id: 'resto-fallback', name: '🍔 Restoran & Cafe (F&B) (Hardcoded, butuh Setup DB)', category: 'RESTO' },
            { id: 'souvenir-fallback', name: '🎁 Toko Merchandise (Souvenir)', category: 'SOUVENIR' },
            { id: 'wahana-fallback', name: '🎢 Wahana Bermain (Wahana)', category: 'WAHANA' }
          ],
          needs_setup: true
        });
      }
      throw error;
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, category } = await request.json();
    const { data, error } = await supabaseAdmin
      .from('pos_terminals')
      .insert({ name, category })
      .select()
      .single();
      
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('ID required');
    
    const { error } = await supabaseAdmin
      .from('pos_terminals')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
