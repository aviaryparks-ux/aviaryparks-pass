import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, min_qty, max_qty, price } = body;

    if (!name || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from('ticket_packages').insert([{
      name,
      min_qty: Number(min_qty),
      max_qty: Number(max_qty),
      price: Number(price),
      is_active: true
    }]).select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
