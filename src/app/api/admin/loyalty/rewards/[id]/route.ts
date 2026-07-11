import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { AuditLogger } from '@/lib/AuditLogger';
import { jwtVerify } from 'jose';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  return new TextEncoder().encode(secret);
};

async function getAdminId(request: Request): Promise<string | null> {
  try {
    // @ts-ignore - next/server Request has cookies in NextRequest but this is standard Request
    const cookies = (request as any).cookies;
    if (cookies) {
      const token = cookies.get('system_token')?.value;
      if (token) {
        const { payload } = await jwtVerify(token, getJwtSecretKey());
        return payload.sub as string;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

// ── SECURITY: Whitelist allowed fields for reward updates ──
const ALLOWED_REWARD_FIELDS = ['name', 'description', 'points_required', 'reward_type', 'is_active', 'image_url', 'expires_in_days'];

// ── SECURITY: Validate UUID format ──
const isValidUUID = (str: string): boolean => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
};

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // ── SECURITY: Validate ID format ──
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid reward ID format' }, { status: 400 });
    }

    const body = await request.json();

    // ── SECURITY: Whitelist allowed update fields ──
    const sanitized: Record<string, unknown> = {};
    for (const key of ALLOWED_REWARD_FIELDS) {
      if (key in body) {
        sanitized[key] = body[key];
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // ── SECURITY: Validate points_required if provided ──
    if ('points_required' in sanitized) {
      const pointsRequired = Number(sanitized.points_required);
      if (isNaN(pointsRequired) || pointsRequired < 0) {
        return NextResponse.json({ error: 'Invalid points_required value' }, { status: 400 });
      }
      sanitized.points_required = pointsRequired;
    }

    // ── SECURITY: Validate reward_type if provided ──
    if ('reward_type' in sanitized) {
      const validTypes = ['VOUCHER_50K', 'VOUCHER_100K', 'DISCOUNT', 'ITEM', 'FREE_RIDE', 'EXTEND_PASS'];
      if (!validTypes.includes(sanitized.reward_type as string)) {
        return NextResponse.json({ error: 'Invalid reward_type' }, { status: 400 });
      }
    }

    const { error } = await supabaseAdmin
      .from('rewards_catalog')
      .update(sanitized)
      .eq('id', id);

    if (error) {
      console.error('Rewards PUT Error:', error);
      return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 });
    }

    const adminId = await getAdminId(request);
    await AuditLogger.log(adminId, 'UPDATE_REWARD', 'rewards_catalog', { reward_id: id, changes: sanitized });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Rewards PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // ── SECURITY: Validate ID format ──
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid reward ID format' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('rewards_catalog')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Rewards DELETE Error:', error);
      return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 });
    }

    const adminId = await getAdminId(request);
    await AuditLogger.log(adminId, 'DELETE_REWARD', 'rewards_catalog', { reward_id: id });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Rewards DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 });
  }
}
