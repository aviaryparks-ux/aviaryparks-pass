import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── SECURITY: Validate required fields ──
const isValidTerminalInput = (name: string | undefined, category: string | undefined): boolean => {
  if (!name || !category) return false;
  if (name.length < 1 || name.length > 200) return false;
  const validCategories = ['RESTO', 'SOUVENIR', 'WAHANA'];
  return validCategories.includes(category);
};

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('pos_terminals')
      .select('*, wahanas(id, name)')
      .order('created_at', { ascending: true });

    if (error) {
      // Fallback if table doesn't exist yet
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          data: [
            { id: 'resto-fallback', name: 'Restoran & Cafe (F&B)', category: 'RESTO' },
            { id: 'souvenir-fallback', name: 'Toko Merchandise (Souvenir)', category: 'SOUVENIR' },
            { id: 'wahana-fallback', name: 'Wahana Bermain (Wahana)', category: 'WAHANA' }
          ],
          needs_setup: true
        });
      }
      console.error('POS Terminals GET Error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch terminals' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('POS Terminals GET Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch terminals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, category, wahana_id } = await request.json();

    // ── SECURITY: Validate input ──
    if (!isValidTerminalInput(name, category)) {
      return NextResponse.json({ success: false, error: 'Invalid terminal name or category' }, { status: 400 });
    }

    // Validasi: WAHANA terminal harus ada wahana_id
    if (category === 'WAHANA' && !wahana_id) {
      return NextResponse.json({ success: false, error: 'Terminal kategori WAHANA wajib memilih wahana' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('pos_terminals')
      .insert({ name, category, wahana_id: category === 'WAHANA' ? (wahana_id || null) : null })
      .select('*, wahanas(id, name)')
      .single();

    if (error) {
      console.error('POS Terminals POST Error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create terminal' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('POS Terminals POST Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create terminal' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Terminal ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('pos_terminals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('POS Terminals DELETE Error:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete terminal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('POS Terminals DELETE Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete terminal' }, { status: 500 });
  }
}
