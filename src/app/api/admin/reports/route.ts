import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Fetch visits
    const { data: visitsData, error: visitsError } = await supabaseAdmin
      .from('visits')
      .select('*')
      .eq('status', 'SUCCESS')
      .order('visited_at', { ascending: false });

    if (visitsError) {
      console.error('Error fetching visits for report:', visitsError);
      return NextResponse.json({ success: false, error: 'Failed to fetch report data' }, { status: 500 });
    }

    // Fetch members
    const { data: membersData, error: membersError } = await supabaseAdmin
      .from('members')
      .select('id, name, nik, group_id, role');

    if (membersError) {
      console.error('Error fetching members for report:', membersError);
      return NextResponse.json({ success: false, error: 'Failed to fetch members data' }, { status: 500 });
    }

    // Create member lookup
    const membersMap = new Map();
    membersData?.forEach((m: any) => membersMap.set(m.id, m));

    // Process and aggregate data by Date and Group ID
    const aggregated = new Map<string, any>();

    visitsData?.forEach((visit: any) => {
      const member = membersMap.get(visit.member_id);
      if (!member) return; // Skip if no member data found

      // Extract date (YYYY-MM-DD) based on Jakarta timezone
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(visit.visited_at));
      
      const groupId = member.group_id || member.id;
      const groupingKey = `${dateStr}_${groupId}`;

      if (aggregated.has(groupingKey)) {
        const existing = aggregated.get(groupingKey);
        
        // Prevent duplicate pax counting for the exact same member on the same day
        if (!existing.seen_members.has(member.id)) {
          existing.total_pax += 1;
          existing.seen_members.add(member.id);
        }

        // If this member is the PRIMARY, prefer their name
        if (member.role === 'PRIMARY') {
          existing.name = member.name;
          existing.member_number = member.nik || member.id.substring(0, 8);
        }
      } else {
        aggregated.set(groupingKey, {
          date: dateStr,
          member_number: member.nik || member.id.substring(0, 8),
          name: member.role === 'PRIMARY' ? member.name : (member.name + ' (Group)'), 
          group_id: groupId,
          total_pax: 1,
          seen_members: new Set([member.id])
        });
      }
    });

    const reportsData = Array.from(aggregated.values());
    
    // Sort by date descending
    reportsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ success: true, data: reportsData });

  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
