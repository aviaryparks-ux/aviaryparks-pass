import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const { data, error } = await supabaseAdmin.rpc('get_schema');
  // Just let it error if RPC doesn't exist, I'll fallback to querying the members table schema from postgres metadata if needed.
  return NextResponse.json({ data, error });
}
