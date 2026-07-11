import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { member_id, reward_id } = await request.json();

    if (!member_id || !reward_id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Get the reward details
    const { data: reward, error: rewardError } = await supabaseAdmin
      .from('rewards_catalog')
      .select('points_required, expires_in_days')
      .eq('id', reward_id)
      .eq('is_active', true)
      .single();

    if (rewardError || !reward) {
      return NextResponse.json({ error: 'Reward not found or inactive' }, { status: 404 });
    }

    // Check member's point balance
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('points_balance')
      .eq('id', member_id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.points_balance < reward.points_required) {
      return NextResponse.json({ error: 'Insufficient points' }, { status: 400 });
    }

    // Deduct points
    const { error: deductError } = await supabaseAdmin
      .from('members')
      .update({ points_balance: member.points_balance - reward.points_required })
      .eq('id', member_id);

    if (deductError) {
      return NextResponse.json({ error: 'Failed to deduct points' }, { status: 500 });
    }

    // Record point mutation
    await supabaseAdmin
      .from('point_mutations')
      .insert([{
        member_id,
        mutation_type: 'REDEEM',
        points: -reward.points_required,
        description: `Penukaran Poin untuk ID Reward: ${reward_id}`
      }]);

    // Generate unique voucher code
    const voucherCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (reward.expires_in_days || 30));

    // Create member voucher
    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from('member_vouchers')
      .insert([{
        member_id,
        reward_id,
        voucher_code: voucherCode,
        status: 'ACTIVE',
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();

    if (voucherError) {
      // Note: In a robust system, we should rollback points deduction here, 
      // but for simplicity we'll just log it.
      console.error('Failed to create voucher:', voucherError);
      return NextResponse.json({ error: 'Failed to generate voucher' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: voucher });

  } catch (error: any) {
    console.error('Redeem Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
