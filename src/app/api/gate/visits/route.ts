import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { sendVisitNotificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { member_id, location } = await request.json();
    const { data, error } = await supabaseAdmin.from('visits').insert([{ member_id, location }]).select();
    if (error) throw error;

    // Send email asynchronously without waiting
    supabaseAdmin.from('members').select('email, name').eq('id', member_id).single().then(({ data: member }) => {
      if (member && member.email) {
        sendVisitNotificationEmail(member.email, member.name, location);
      }
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
