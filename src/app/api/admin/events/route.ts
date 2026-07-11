import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { AuditLogger } from '@/lib/AuditLogger';

// ── SECURITY: Whitelist allowed fields for events ──
const ALLOWED_EVENT_FIELDS = ['title', 'description', 'content', 'event_date', 'image_url', 'status'];

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .order('event_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Events GET Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── SECURITY: Validate required fields ──
    if (!body.title || !body.description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    // ── SECURITY: Whitelist and sanitize input ──
    const sanitized: Record<string, unknown> = {};
    for (const key of ALLOWED_EVENT_FIELDS) {
      if (key in body) {
        sanitized[key] = body[key];
      }
    }

    // Ensure required fields are present
    sanitized.title = body.title;
    sanitized.description = body.description;
    sanitized.status = body.status || 'ACTIVE';

    const { data, error } = await supabaseAdmin.from('events').insert([sanitized]).select();

    if (error) {
      console.error('Events POST Error:', error);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    if (data && data.length > 0) {
      await AuditLogger.log(request, 'CREATE', 'EVENT', data[0].id, sanitized);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Events POST Error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // ── SECURITY: Whitelist allowed update fields ──
    const sanitized: Record<string, unknown> = {};
    for (const key of ALLOWED_EVENT_FIELDS) {
      if (key in updates) {
        sanitized[key] = updates[key];
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('events').update(sanitized).eq('id', id);

    if (error) {
      console.error('Events PUT Error:', error);
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    await AuditLogger.log(request, 'UPDATE', 'EVENT', id, sanitized);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Events PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // ── SECURITY: Validate ID format (basic check) ──
    if (id.length < 1 || id.length > 100) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('events').delete().eq('id', id);

    if (error) {
      console.error('Events DELETE Error:', error);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    await AuditLogger.log(request, 'DELETE', 'EVENT', id, { event_id: id });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Events DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
