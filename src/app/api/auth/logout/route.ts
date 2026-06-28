import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  
  // Clear the JWT token cookie
  response.cookies.set({
    name: 'system_token',
    value: '',
    httpOnly: true,
    expires: new Date(0), // Expire immediately
    path: '/'
  });

  return response;
}
