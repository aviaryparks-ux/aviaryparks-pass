import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVisitorFromRequest, unauthorizedResponse } from '@/lib/visitorAuth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── SECURITY: This endpoint now requires visitor authentication
export async function GET(request: NextRequest) {
  try {
    // ── SECURITY: Require visitor authentication ──
    const visitor = await getVisitorFromRequest(request);
    if (!visitor) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');

    // ── SECURITY: Validate memberId if provided ──
    // If memberId is provided, verify it belongs to the visitor's group
    if (memberId) {
      const { data: member, error: memberErr } = await supabaseAdmin
        .from('members')
        .select('id, group_id')
        .eq('id', memberId)
        .single();

      if (memberErr || !member) {
        return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
      }

      // ── SECURITY: Verify ownership ──
      if (member.group_id !== visitor.groupId) {
        return NextResponse.json({ success: false, error: 'Forbidden: You can only access your own data' }, { status: 403 });
      }
    }

    // 1. Fetch active rewards catalog
    const { data: rewards, error: rError } = await supabaseAdmin
      .from('rewards_catalog')
      .select('*')
      .eq('is_active', true)
      .order('points_required', { ascending: true });

    if (rError) {
      console.error('Rewards Fetch Error:', rError);
      throw rError;
    }

    let mutations: unknown[] = [];
    let vouchers: unknown[] = [];

    // 2. Fetch point mutations and vouchers for the authenticated visitor's member
    if (memberId) {
      const { data: mData, error: mError } = await supabaseAdmin
        .from('point_mutations')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (mError) {
        console.error('Mutations Fetch Error:', mError);
        throw mError;
      }
      mutations = mData || [];

      // Fetch member vouchers joined with rewards_catalog
      const { data: vData, error: vError } = await supabaseAdmin
        .from('member_vouchers')
        .select(`
          *,
          rewards_catalog(name, description, image_url)
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (vError) {
        console.error('Vouchers Fetch Error:', vError);
      } else {
        vouchers = vData || [];
      }
    }

    return NextResponse.json({ success: true, data: { rewards, mutations, vouchers } });
  } catch (error: unknown) {
    console.error('Visitor Loyalty Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch loyalty data' }, { status: 500 });
  }
}
