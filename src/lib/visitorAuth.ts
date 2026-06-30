import { jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export interface VisitorPayload {
  memberId: string;
  groupId: string;
  email: string;
  role: string;
}

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
};

/**
 * Baca dan verifikasi visitor_token cookie dari request.
 * Return payload jika valid, null jika tidak ada atau invalid.
 */
export async function getVisitorFromRequest(request: NextRequest): Promise<VisitorPayload | null> {
  const token = request.cookies.get('visitor_token')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (payload.role !== 'VISITOR') return null;
    return {
      memberId: payload.memberId as string,
      groupId: payload.groupId as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

/** Return response 401 standar untuk visitor yang tidak terautentikasi */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized. Silakan login kembali.' }, { status: 401 });
}
