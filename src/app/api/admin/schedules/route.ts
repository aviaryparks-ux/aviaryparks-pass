import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { AuditLogger } from '@/lib/AuditLogger';

// ── SECURITY: Whitelist allowed fields for schedules ──
const ALLOWED_SCHEDULE_FIELDS = ['title', 'description', 'start_time', 'end_time', 'location', 'image_url', 'status'];

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('schedules')
      .select('*')
      .order('start_time', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Schedules GET Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── SECURITY: Validate required fields ──
    if (!body.title || !body.start_time || !body.end_time) {
      return NextResponse.json({ error: 'Title, start_time, and end_time are required' }, { status: 400 });
    }

    // ── SECURITY: Whitelist and sanitize input ──
    const sanitized: Record<string, unknown> = {};
    for (const key of ALLOWED_SCHEDULE_FIELDS) {
      if (key in body) {
        sanitized[key] = body[key];
      }
    }

    // Ensure required fields are present
    sanitized.title = body.title;
    sanitized.start_time = body.start_time;
    sanitized.end_time = body.end_time;
    sanitized.status = body.status || 'ACTIVE';

    const { data, error } = await supabaseAdmin.from('schedules').insert([sanitized]).select();

    if (error) {
      console.error('Schedules POST Error:', error);
      return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
    }

    if (data && data.length > 0) {
      await AuditLogger.log(request, 'CREATE', 'SCHEDULE', data[0].id, sanitized);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Schedules POST Error:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    // ── SECURITY: Whitelist allowed update fields ──
    const sanitized: Record<string, unknown> = {};
    for (const key of ALLOWED_SCHEDULE_FIELDS) {
      if (key in updates) {
        sanitized[key] = updates[key];
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('schedules').update(sanitized).eq('id', id);

    if (error) {
      console.error('Schedules PUT Error:', error);
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
    }

    await AuditLogger.log(request, 'UPDATE', 'SCHEDULE', id, sanitized);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Schedules PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    // ── SECURITY: Validate ID format (basic check) ──
    if (id.length < 1 || id.length > 100) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('schedules').delete().eq('id', id);

    if (error) {
      console.error('Schedules DELETE Error:', error);
      return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
    }

    await AuditLogger.log(request, 'DELETE', 'SCHEDULE', id, { schedule_id: id });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Schedules DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
