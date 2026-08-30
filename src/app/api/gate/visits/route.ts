import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { member_id, location = 'Gerbang Utama' } = await request.json();

    if (!member_id) {
      return NextResponse.json({ error: 'member_id is required' }, { status: 400 });
    }

    const now = new Date();
    // Awal hari ini (00:00:00 WIB / Jam lokal)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const nowIso = now.toISOString();

    // 1. Cek apakah member sudah pernah masuk hari ini (Aturan 1x Kunjungan per Hari)
    const { data: todayVisits } = await supabaseAdmin
      .from('visits')
      .select('id, visited_at')
      .eq('member_id', member_id)
      .gte('visited_at', startOfToday)
      .limit(1);

    if (todayVisits && todayVisits.length > 0) {
      const visitTime = new Date(todayVisits[0].visited_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      return NextResponse.json({ 
        success: false, 
        already_checked_in: true,
        error: `Tiket Annual Pass sudah digunakan hari ini (Pukul ${visitTime} WIB). Kuota masuk 1x per hari.` 
      }, { status: 403 });
    }

    // 2. Sesuai skema tabel Supabase: member_id, status, visited_at
    let insertResult = await supabaseAdmin
      .from('visits')
      .insert([{ 
        member_id, 
        status: 'SUCCESS',
        visited_at: nowIso
      }])
      .select();

    if (insertResult.error) {
      console.warn('Initial insert failed, trying member_id only:', insertResult.error.message);
      insertResult = await supabaseAdmin
        .from('visits')
        .insert([{ member_id }])
        .select();
    }

    const { data, error } = insertResult;

    if (error) {
      console.error('Supabase visit insert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Asynchronously send WhatsApp Welcome Greeting to Member
    (async () => {
      try {
        const { data: member } = await supabaseAdmin
          .from('members')
          .select('name, phone')
          .eq('id', member_id)
          .single();

        if (member && member.phone) {
          const checkInTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const waMessage = `🌿 *SELAMAT DATANG DI AVIARY PARK INDONESIA* 🦜\n\nHalo *${member.name}*,\nKunjungan Anda pada pukul *${checkInTime} WIB* telah tercatat di *${location}*.\n\nNikmati keindahan satwa dan berbagai wahana menarik bersama kami hari ini! ✨\n\n_Pusat Bantuan & Layanan Aviary Park Indonesia_`;
          await sendWhatsAppMessage(member.phone, waMessage);
        }
      } catch (err) {
        console.error('Failed to send Gate WhatsApp notification:', err);
      }
    })();

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Gate Visits Exception:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to record visit' }, { status: 500 });
  }
}

// In-memory daily wristband mapping: [card_uid] -> member_id
const wristbandDailyMap = new Map<string, string>();

export async function PUT(request: NextRequest) {
  try {
    const { member_id, card_uid } = await request.json();
    if (!member_id || !card_uid) {
      return NextResponse.json({ success: false, error: 'member_id and card_uid are required' }, { status: 400 });
    }

    const cleanCardUid = String(card_uid).trim();

    // 1. Simpan ke Global In-Memory Map untuk lookup cepat di wahana
    wristbandDailyMap.set(cleanCardUid.toLowerCase(), member_id);
    wristbandDailyMap.set(cleanCardUid, member_id);

    // 2. Coba update kolom card_uid di tabel members jika sudah ada
    try {
      await supabaseAdmin
        .from('members')
        .update({ card_uid: cleanCardUid })
        .eq('id', member_id);
    } catch (dbErr) {
      console.warn('Optional db card_uid update skipped:', dbErr);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Gelang Calisto berhasil dikaitkan!', 
      data: { id: member_id, card_uid: cleanCardUid } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to link card' }, { status: 500 });
  }
}

export { wristbandDailyMap };
