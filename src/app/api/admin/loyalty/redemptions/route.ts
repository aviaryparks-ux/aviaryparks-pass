import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: vouchers, error: vErr } = await supabaseAdmin
      .from('member_vouchers')
      .select('*')
      .order('created_at', { ascending: false });

    if (vErr) throw vErr;

    const { data: members, error: mErr } = await supabaseAdmin
      .from('members')
      .select('id, name, email');
      
    const { data: rewards, error: rErr } = await supabaseAdmin
      .from('rewards_catalog')
      .select('id, name, reward_type, points_required');

    if (mErr || rErr) throw (mErr || rErr);

    const membersMap = Object.fromEntries(members.map(m => [m.id, m]));
    const rewardsMap = Object.fromEntries(rewards.map(r => [r.id, r]));

    const data = vouchers.map(v => ({
      ...v,
      members: membersMap[v.member_id] || null,
      rewards_catalog: rewardsMap[v.reward_id] || null
    }));
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching redemptions:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch redemptions' }, { status: 500 });
  }
}
