import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { sendVisitNotificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { member_id, location } = await request.json();
    // The database table only has id, member_id, status, visited_at.
    // Do not insert 'location' as it does not exist in the schema.
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
