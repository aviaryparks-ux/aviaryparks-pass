import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { NotificationService } from '@/lib/NotificationService';
import { AuditLogger } from '@/lib/AuditLogger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member_id, subtotal, location, terminal_name, invoice_number } = body;

    // 🚨 SECURITY: Validate required fields 🚨
    if (!member_id || subtotal === undefined || subtotal === null) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    // ── SECURITY: Validate subtotal is a positive number ──
    const validSubtotal = Number(subtotal);
    if (isNaN(validSubtotal) || validSubtotal < 0) {
      return NextResponse.json({ success: false, error: 'Invalid subtotal amount' }, { status: 400 });
    }

    // Lock the member row (optional now since no points, but good for consistency)
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('id, name, phone')
      .eq('id', member_id)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    // Insert POS Transaction
    const { data: posTx, error: posErr } = await supabaseAdmin.from('pos_transactions').insert({
      member_id,
      location: location || 'RESTO',
      terminal_name: terminal_name || null,
      amount: validSubtotal,
      points_earned: 0,
      invoice_number: invoice_number || null
    }).select().single();

    if (posErr) {
      console.error('POS Transaction Error:', posErr);
      return NextResponse.json({ success: false, error: 'Gagal menyimpan transaksi' }, { status: 500 });
    }

    // Send Notification (Non-blocking)
    if (member.phone) {
      const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(validSubtotal);
      let waMessage = `Halo ${member.name},\n\nTerima kasih telah bertransaksi di ${location || 'Aviary Park'}.\nTotal: ${formattedAmount}\n\nSelamat menikmati waktu Anda di taman!`;
      
      NotificationService.sendWhatsApp(member.phone, waMessage).catch(console.error);
    }

    await AuditLogger.log(request, 'CREATE', 'POS_TRANSACTION', posTx.id, {
      member_id,
      amount: validSubtotal,
      terminal: terminal_name
    });

    return NextResponse.json({
      success: true,
      data: {
        transaction_id: posTx.id,
        final_total: validSubtotal
      }
    });

  } catch (error: unknown) {
    console.error('POS Transaction Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
