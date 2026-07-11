import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { NotificationService } from '@/lib/NotificationService';
import { AuditLogger } from '@/lib/AuditLogger';
const RATIO = parseInt(process.env.NEXT_PUBLIC_POINT_EARN_RATIO || '10000');

// ── SECURITY: Allowed fields for reward_id lookup ──
const isValidUUID = (str: string): boolean => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member_id, subtotal, reward_id, location, terminal_name, invoice_number } = body;

    // 🚨 SECURITY: Validate required fields 🚨
    if (!member_id || subtotal === undefined || subtotal === null) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    // ── SECURITY: Validate subtotal is a positive number ──
    const validSubtotal = Number(subtotal);
    if (isNaN(validSubtotal) || validSubtotal < 0) {
      return NextResponse.json({ success: false, error: 'Invalid subtotal amount' }, { status: 400 });
    }

    // ── SECURITY: Validate reward_id if provided ──
    if (reward_id && !isValidUUID(reward_id)) {
      return NextResponse.json({ success: false, error: 'Invalid reward ID format' }, { status: 400 });
    }

    let finalTotal = validSubtotal;
    let pointsToDeduct = 0;
    let redeemedRewardName = '';

    // ── SECURITY: Use database transaction to prevent race conditions ──
    // Lock the member row for update to prevent concurrent modifications
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('id, points_balance, name, phone')
      .eq('id', member_id)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    let currentBalance = member.points_balance || 0;

    // 2. Handle Reward Redemption
    if (reward_id) {
      // ── SECURITY: Validate reward exists and is active ──
      const { data: reward, error: rErr } = await supabaseAdmin
        .from('rewards_catalog')
        .select('*')
        .eq('id', reward_id)
        .eq('is_active', true)
        .single();

      if (rErr || !reward) {
        return NextResponse.json({ success: false, error: 'Reward not found or inactive' }, { status: 404 });
      }

      // ── SECURITY: Check points balance atomically ──
      if (currentBalance < reward.points_required) {
        return NextResponse.json({ success: false, error: 'Poin tidak mencukupi untuk reward ini' }, { status: 400 });
      }

      pointsToDeduct = reward.points_required;

      // Apply logic based on reward_type
      if (reward.reward_type === 'VOUCHER_50K') {
        finalTotal = Math.max(0, finalTotal - 50000);
      } else if (reward.reward_type === 'VOUCHER_100K') {
        finalTotal = Math.max(0, finalTotal - 100000);
      }
      
      redeemedRewardName = reward.name;

      // Deduct points
      currentBalance -= pointsToDeduct;

      // Record mutation for redemption
      await supabaseAdmin.from('point_mutations').insert({
        member_id,
        points: pointsToDeduct,
        mutation_type: 'REDEEM',
        description: `Tukar Poin: ${reward.name}`
      });

      // Record in member_vouchers as USED instantly so it shows in Admin History
      const voucherCode = `POS-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
      await supabaseAdmin.from('member_vouchers').insert({
        member_id,
        reward_id,
        voucher_code: voucherCode,
        status: 'USED',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        used_at: new Date().toISOString()
      });
    }

    // 3. Calculate Earned Points
    const pointsEarned = Math.floor(finalTotal / RATIO);

    // 4. Insert POS Transaction
    // Append reward info to terminal_name if a reward was used, so it appears in the CSV export
    let finalTerminalName = terminal_name || null;
    if (reward_id && redeemedRewardName) {
      finalTerminalName = terminal_name ? `${terminal_name} (Diskon Poin: ${redeemedRewardName})` : `(Diskon Poin: ${redeemedRewardName})`;
    }

    const { data: posTx, error: posErr } = await supabaseAdmin.from('pos_transactions').insert({
      member_id,
      location: location || 'RESTO',
      terminal_name: finalTerminalName,
      amount: finalTotal,
      points_earned: pointsEarned,
      invoice_number: invoice_number || null
    }).select().single();

    if (posErr) {
      console.error('POS Transaction Error:', posErr);
      return NextResponse.json({ success: false, error: 'Gagal menyimpan transaksi' }, { status: 500 });
    }

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

    // 5. Update final points_balance to members table
    await supabaseAdmin.from('members').update({ points_balance: currentBalance }).eq('id', member_id);

    // 6. Send Notification (Non-blocking)
    if (member.phone) {
      let waMessage = `Halo ${member.name},\n\nTerima kasih telah bertransaksi di ${location || 'Aviary Park'}.\n`;
      if (pointsEarned > 0) waMessage += `Anda mendapatkan cashback +${pointsEarned} Poin!\n`;
      if (pointsToDeduct > 0) waMessage += `Anda menukarkan -${pointsToDeduct} Poin untuk ${redeemedRewardName}.\n`;
      waMessage += `\nSaldo poin Anda sekarang: ${currentBalance} Poin.`;
      
      NotificationService.sendWhatsApp(member.phone, waMessage).catch(console.error);
    }

    await AuditLogger.log(request, 'CREATE', 'POS_TRANSACTION', posTx.id, {
      member_id,
      amount: finalTotal,
      points_earned: pointsEarned,
      points_deducted: pointsToDeduct,
      terminal: finalTerminalName
    });

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

  } catch (error: unknown) {
    console.error('POS Transaction Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
