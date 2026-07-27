import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getVisitorFromRequest, unauthorizedResponse } from '@/lib/visitorAuth';

// ── SECURITY: Whitelist field yang boleh di-update oleh visitor ──
const ALLOWED_UPDATE_FIELDS = ['name', 'phone', 'address', 'photo_url', 'emergency_contact', 'emergency_phone'];

export async function GET(request: NextRequest) {
  try {
    const visitor = await getVisitorFromRequest(request);
    if (!visitor) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const groupId = searchParams.get('group_id');
    const single = searchParams.get('single') === 'true';

    // Verify Ownership
    if (groupId && groupId !== visitor.groupId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    let query = supabaseAdmin.from('members').select('*');

    if (id) {
      // We must ensure the requested 'id' also belongs to the visitor's group
      query = query.eq('id', id).eq('group_id', visitor.groupId);
    } else if (groupId) {
      query = query.eq('group_id', groupId).order('created_at', { ascending: true });
    } else {
      return NextResponse.json({ success: false, error: 'id or group_id is required' }, { status: 400 });
    }

    if (single) {
      const { data, error } = await query.limit(1).single();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    } else {
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching members:', error);
    return NextResponse.json({ success: false, error: message || 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const visitor = await getVisitorFromRequest(request);
    if (!visitor) return unauthorizedResponse();

    let members = await request.json();

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid members data' }, { status: 400 });
    }

    // ── SECURITY: Mencegah injeksi dengan memaksa group_id dan status ──
    const sanitizedMembers = members.map((m: any) => ({
      ...m,
      group_id: visitor.groupId, // Wajib sesuai dengan visitor yang login
      status: 'PENDING_PAYMENT', // Paksa menjadi pending payment
      role: m.role === 'PRIMARY' ? 'SAUDARA' : (m.role || 'ANAK') // Cegah penambahan PRIMARY baru
    }));

    const { data, error } = await supabaseAdmin.from('members').insert(sanitizedMembers).select();
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error inserting members:', error);
    return NextResponse.json({ success: false, error: message || 'Failed to insert members' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const visitor = await getVisitorFromRequest(request);
    if (!visitor) return unauthorizedResponse();

    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    // Verify Ownership
    const { data: memberCheck } = await supabaseAdmin
      .from('members')
      .select('group_id')
      .eq('id', id)
      .single();

    if (!memberCheck || memberCheck.group_id !== visitor.groupId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // ── SECURITY: Whitelist validation - hanya field yang dizinkan yang boleh di-update ──
    const sanitized = Object.keys(updates)
      .filter(key => ALLOWED_UPDATE_FIELDS.includes(key))
      .reduce((obj, key) => ({ ...obj, [key]: updates[key] }), {});

    // Jika tidak ada field yang valid, reject
    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('members')
      .update(sanitized)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating member:', error);
    return NextResponse.json({ success: false, error: message || 'Failed to update member' }, { status: 500 });
  }
}
