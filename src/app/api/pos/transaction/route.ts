import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RATIO = parseInt(process.env.NEXT_PUBLIC_POINT_EARN_RATIO || '10000');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member_id, subtotal, reward_id } = body;
    let finalTotal = subtotal;
    let pointsToDeduct = 0;
    let rewardName = '';

    // 1. Fetch current member to get points_balance
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('users')
      .select('points_balance')
      .eq('id', member_id)
      .single();
    
    if (memberErr || !member) throw new Error('Member not found');
    let currentBalance = member.points_balance || 0;

    // 2. Handle Reward Redemption
    if (reward_id) {
      const { data: reward, error: rErr } = await supabaseAdmin
        .from('rewards_catalog')
        .select('*')
        .eq('id', reward_id)
        .single();
      
      if (rErr || !reward) throw new Error('Reward not found');
      
      if (currentBalance < reward.points_required) {
        throw new Error('Poin tidak mencukupi untuk reward ini');
      }

      pointsToDeduct = reward.points_required;
      rewardName = reward.name;
      
      // Apply logic based on reward_type
      if (reward.reward_type === 'VOUCHER_50K') {
        finalTotal = Math.max(0, finalTotal - 50000);
      } else if (reward.reward_type === 'VOUCHER_100K') {
        finalTotal = Math.max(0, finalTotal - 100000);
      }
      
      // Deduct points
      currentBalance -= pointsToDeduct;
      
      // Record mutation for redemption
      await supabaseAdmin.from('point_mutations').insert({
        member_id,
        points: pointsToDeduct,
        mutation_type: 'REDEEM',
        description: `Tukar Poin: ${reward.name}`
      });
    }

    // 3. Insert POS Transaction
    const { data: posTx, error: posErr } = await supabaseAdmin.from('pos_transactions').insert({
      member_id,
      location: 'F&B Restaurant',
      total_amount: finalTotal
    }).select().single();

    if (posErr) throw posErr;

    // 4. Calculate Earned Points
    const pointsEarned = Math.floor(finalTotal / RATIO);
    
    if (pointsEarned > 0) {
      currentBalance += pointsEarned;
      // Record mutation for earn
      await supabaseAdmin.from('point_mutations').insert({
        member_id,
        points: pointsEarned,
        mutation_type: 'EARN',
        description: `Cashback Poin dari Transaksi Kasir F&B`
      });
    }

    // 5. Update final points_balance to users table
    await supabaseAdmin.from('users').update({ points_balance: currentBalance }).eq('id', member_id);

    return NextResponse.json({ 
      success: true, 
      data: {
        transaction_id: posTx.id,
        final_total: finalTotal,
        points_deducted: pointsToDeduct,
        points_earned: pointsEarned,
        new_balance: currentBalance
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
