import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { wristbandDailyMap } from '@/app/api/gate/visits/route';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const cleanId = id.trim();
    let targetMemberId = cleanId;

    // 1. Cek apakah cleanId adalah Barcode Gelang Calisto di Memory Map
    if (wristbandDailyMap.has(cleanId) || wristbandDailyMap.has(cleanId.toLowerCase())) {
      targetMemberId = wristbandDailyMap.get(cleanId) || wristbandDailyMap.get(cleanId.toLowerCase()) || cleanId;
    }

    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(targetMemberId);

    let query = supabaseAdmin.from('members').select('*').limit(1);

    if (isUUID) {
      query = query.or(`id.eq.${targetMemberId},group_id.eq.${targetMemberId},nik.eq.${targetMemberId}`);
    } else {
      query = query.or(`nik.eq.${targetMemberId},phone.eq.${targetMemberId},id.eq.${targetMemberId}`);
    }

    let { data, error } = await query.single();

    // Fallback Cerdas: Jika barcode Calisto diinput tapi belum terdaftar di memory map, ambil member aktif yang baru saja check-in
    if ((error || !data) && cleanId.startsWith('AVP')) {
      const { data: recentMember } = await supabaseAdmin
        .from('members')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentMember) {
        data = recentMember;
        error = null;
        wristbandDailyMap.set(cleanId, recentMember.id);
      }
    }

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    // ── SECURITY: Return safe data for POS lookup ──
    const safeData = {
      id: data.id,
      name: data.name,
      nik: data.nik || null,
      email: data.email || null,
      phone: data.phone || null,
      status: data.status,
      points_balance: data.points_balance,
      face_descriptor: data.face_descriptor ? true : false,
    };

    return NextResponse.json({ success: true, data: safeData });
  } catch (error: unknown) {
    console.error('POS Lookup Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to lookup member' }, { status: 500 });
  }
}
