import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ── SECURITY: Validate NIK format (16 digits) ──
const isValidNIK = (nik: string): boolean => {
  return /^\d{16}$/.test(nik);
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

    // ── SECURITY: If not UUID, validate NIK format ──
    if (!isUUID && !isValidNIK(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID format. Must be a valid UUID or 16-digit NIK' }, { status: 400 });
    }

    let query = supabaseAdmin.from('members').select('*').limit(1);

    if (isUUID) {
      query = query.or(`id.eq.${id},nik.eq.${id}`);
    } else {
      query = query.eq('nik', id);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    // ── SECURITY: Return limited data for POS lookup (hide sensitive fields) ──
    const safeData = {
      id: data.id,
      name: data.name,
      status: data.status,
      points_balance: data.points_balance,
      face_descriptor: data.face_descriptor ? true : false, // Only indicate if face is registered
    };

    return NextResponse.json({ success: true, data: safeData });
  } catch (error: unknown) {
    console.error('POS Lookup Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to lookup member' }, { status: 500 });
  }
}
