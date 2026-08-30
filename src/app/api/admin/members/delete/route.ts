import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { AuditLogger } from '@/lib/AuditLogger';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing member ID' }, { status: 400 });
    }

    // Ambil data member sebelum dihapus untuk detail log
    const { data: memberData } = await supabaseAdmin
      .from('members')
      .select('id, name, nik, email, phone')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin.from('members').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await AuditLogger.log(request, 'DELETE', 'MEMBER', id, memberData || { member_id: id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
