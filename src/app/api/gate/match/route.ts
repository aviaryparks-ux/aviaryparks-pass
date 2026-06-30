import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { descriptorArray } = await request.json();

    if (!descriptorArray || !Array.isArray(descriptorArray) || descriptorArray.length !== 128) {
      return NextResponse.json({ error: 'Invalid descriptor' }, { status: 400 });
    }

    // Format the array into a vector string like "[1.1, 2.2, ...]"
    const vectorString = `[${descriptorArray.join(',')}]`;

    // Call the RPC function 'match_face'
    // Threshold 0.55 means similarity must be > 0.45.
    const { data, error } = await supabaseAdmin.rpc('match_face', {
      query_embedding: vectorString,
      match_threshold: 0.55,
      match_count: 1
    });

    if (error) {
      console.error('RPC Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data && data.length > 0) {
      // Find the member record
      const memberId = data[0].id;
      const { data: memberData } = await supabaseAdmin
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();
        
      if (memberData) {
        let familyData = [];
        if (memberData.group_id) {
          const { data: fData } = await supabaseAdmin
            .from('members')
            .select('*')
            .eq('group_id', memberData.group_id)
            .neq('id', memberId);
          if (fData) familyData = fData;
        }
        return NextResponse.json({ data: memberData, family: familyData });
      }
    }

    // No match found
    return NextResponse.json({ data: null });

  } catch (error: any) {
    console.error('Match Face Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
