import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  const { data } = await supabaseAdmin.from('transactions').select('*').order('created_at', { ascending: false });
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('transactions').update({ payment_status: status }).eq('id', id);
  if (error) {
    console.error('Transactions PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
