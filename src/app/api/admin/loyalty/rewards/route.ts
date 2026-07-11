import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── SECURITY: Whitelist allowed fields for rewards ──
const ALLOWED_REWARD_FIELDS = ['name', 'description', 'points_required', 'reward_type', 'is_active', 'image_url', 'expires_in_days'];

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('rewards_catalog')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Rewards GET Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch rewards' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── SECURITY: Validate required fields ──
    if (!body.name || body.points_required === undefined) {
      return NextResponse.json({ error: 'Name and points_required are required' }, { status: 400 });
    }

    // ── SECURITY: Validate points_required is a positive number ──
    const pointsRequired = Number(body.points_required);
    if (isNaN(pointsRequired) || pointsRequired < 0) {
      return NextResponse.json({ error: 'Invalid points_required value' }, { status: 400 });
    }

    // ── SECURITY: Whitelist and sanitize input ──
    const sanitized: Record<string, unknown> = {};
    for (const key of ALLOWED_REWARD_FIELDS) {
      if (key in body) {
        sanitized[key] = body[key];
      }
    }

    // Ensure required fields are present
    sanitized.name = body.name;
    sanitized.points_required = pointsRequired;
    sanitized.is_active = body.is_active !== false;

    // ── SECURITY: Validate reward_type if provided ──
    if (body.reward_type) {
      const validTypes = ['VOUCHER_50K', 'VOUCHER_100K', 'DISCOUNT', 'ITEM', 'FREE_RIDE', 'EXTEND_PASS'];
      if (!validTypes.includes(body.reward_type)) {
        return NextResponse.json({ error: 'Invalid reward_type' }, { status: 400 });
      }
      sanitized.reward_type = body.reward_type;
    } else {
      sanitized.reward_type = 'VOUCHER_50K'; // default
    }

    const { data, error } = await supabaseAdmin
      .from('rewards_catalog')
      .insert([sanitized])
      .select();

    if (error) {
      console.error('Rewards POST Error:', error);
      return NextResponse.json({ error: 'Failed to create reward' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Rewards POST Error:', error);
    return NextResponse.json({ error: 'Failed to create reward' }, { status: 500 });
  }
}
