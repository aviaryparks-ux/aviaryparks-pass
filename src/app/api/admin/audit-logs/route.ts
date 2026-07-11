import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Audit logs API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // In a real production system, you would extract the actor_id and actor_name 
    // directly from the verified system_token here, rather than trusting the client payload.
    // However, for this implementation, we accept the payload.

    const { actor_id, actor_name, action_type, entity_type, entity_id, details } = body;

    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .insert([
        {
          actor_id,
          actor_name,
          action_type,
          entity_type,
          entity_id,
          details
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating audit log:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Audit log creation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
