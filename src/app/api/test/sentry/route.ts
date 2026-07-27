import { NextResponse } from 'next/server';

export async function GET() {
  // Ini akan melempar error dengan sengaja untuk menguji integrasi Sentry
  throw new Error('Sentry Test Error: Ini adalah pesan percobaan untuk menguji error tracking!');
  
  // Baris ini tidak akan pernah tereksekusi
  return NextResponse.json({ status: 'Ok' });
}
