import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { sendVisitNotificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { member_id, location } = await request.json();
    
    // 1 Hari = 1 Kunjungan (Deduplikasi)
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
    const startOfDayWIB = new Date(`${todayStr}T00:00:00.000+07:00`).toISOString();
    const endOfDayWIB = new Date(`${todayStr}T23:59:59.999+07:00`).toISOString();

    const { data: existingVisits, error: checkError } = await supabaseAdmin
      .from('visits')
      .select('id')
      .eq('member_id', member_id)
      .gte('visited_at', startOfDayWIB)
      .lte('visited_at', endOfDayWIB)
      .limit(1);

    if (checkError) throw checkError;

    if (existingVisits && existingVisits.length > 0) {
      // Visit already exists for today, skip insertion and skip email
      return NextResponse.json({ success: true, message: 'Visit already recorded for today', data: existingVisits });
    }

    // Insert new visit since it's the first one today
    const { data, error } = await supabaseAdmin.from('visits').insert([{ member_id, status: 'SUCCESS' }]).select();
    if (error) throw error;

    // Send email (MUST BE AWAITED)
    try {
      const { data: member } = await supabaseAdmin.from('members').select('email, name').eq('id', member_id).single();
      if (member && member.email) {
        await sendVisitNotificationEmail(member.email, member.name, location);
      }
    } catch (err) {
      console.error('Failed to send visit email:', err);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
