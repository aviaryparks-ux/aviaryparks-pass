import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getVisitorFromRequest, unauthorizedResponse } from '@/lib/visitorAuth';

// ── SECURITY: Whitelist field yang boleh di-update oleh visitor ──
const ALLOWED_UPDATE_FIELDS = ['name', 'phone', 'address', 'photo_url', 'emergency_contact', 'emergency_phone'];

export async function POST(request: NextRequest) {
  try {
    const visitor = await getVisitorFromRequest(request);
    if (!visitor) return unauthorizedResponse();

    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) {
      return NextResponse.json({ error: 'Missing member ID' }, { status: 400 });
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

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Profile Update Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
