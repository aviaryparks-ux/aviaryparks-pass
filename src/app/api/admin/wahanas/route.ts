import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { AuditLogger } from '@/lib/AuditLogger';

export const dynamic = 'force-dynamic';

// GET all wahanas
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('wahanas')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching wahanas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST new wahana
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('wahanas')
      .insert([{
        name: body.name,
        description: body.description || '',
        topup_price: parseInt(body.topup_price) || 0,
        is_active: body.is_active ?? true
      }])
      .select()
      .single();

    if (error) throw error;

    await AuditLogger.log(request, 'CREATE', 'WAHANA', data.id, { name: data.name, topup_price: data.topup_price });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating wahana:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT (Update) a wahana
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('wahanas')
      .update({
        name: body.name,
        description: body.description,
        topup_price: parseInt(body.topup_price),
        is_active: body.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) throw error;

    await AuditLogger.log(request, 'UPDATE', 'WAHANA', body.id, { name: data.name, topup_price: data.topup_price, is_active: data.is_active });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating wahana:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a wahana
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('wahanas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await AuditLogger.log(request, 'DELETE', 'WAHANA', id, { wahana_id: id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting wahana:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
