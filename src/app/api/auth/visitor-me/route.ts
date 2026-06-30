import { NextRequest, NextResponse } from 'next/server';
import { getVisitorFromRequest } from '@/lib/visitorAuth';

/**
 * GET /api/auth/visitor-me
 * Return data visitor yang sedang login dari JWT cookie.
 * Digunakan oleh dashboard untuk menggantikan localStorage.
 */
export async function GET(request: NextRequest) {
  const visitor = await getVisitorFromRequest(request);

  if (!visitor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: {
      memberId: visitor.memberId,
      groupId: visitor.groupId,
      email: visitor.email,
    },
  });
}
