import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  const { data } = await supabaseAdmin.from('transactions').select('*').order('created_at', { ascending: false });
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, status } = body;
  const { error } = await supabaseAdmin.from('transactions').update({ payment_status: status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
