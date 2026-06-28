import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { groupId } = await request.json();

    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    }

    // Delete all members in this group that are still PENDING_PAYMENT
    const { error } = await supabaseAdmin
      .from('members')
      .delete()
      .eq('group_id', groupId)
      .eq('status', 'PENDING_PAYMENT');

    if (error) {
      console.error('Cancel Payment Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Cancel Payment Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
