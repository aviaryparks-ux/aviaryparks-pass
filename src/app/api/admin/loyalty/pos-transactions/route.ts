import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: posData, error: posError } = await supabaseAdmin
      .from('pos_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (posError) throw posError;

    // Ambil juga voucher transactions tipe USAGE (tukar tiket)
    const { data: vData } = await supabaseAdmin
      .from('voucher_transactions')
      .select('*, wahanas(name)')
      .eq('mutation_type', 'USAGE')
      .order('created_at', { ascending: false });

    // Gabungkan kedua data
    const combinedData = [...(posData || [])];

    if (vData && vData.length > 0) {
      vData.forEach(v => {
        // Cek jika belum ada invoice serupa di posData
        const isAlreadyInPos = combinedData.some(p => p.id === v.id || (p.created_at === v.created_at && p.member_id === v.member_id));
        if (!isAlreadyInPos) {
          combinedData.push({
            id: v.id,
            member_id: v.member_id,
            location: v.wahanas?.name || 'Tukar Tiket Wahana',
            terminal_name: 'Kasir Gate / POS',
            amount: 0,
            payment_method: 'VOUCHER',
            points_earned: 0,
            invoice_number: `TUKAR-${v.id.substring(0, 8).toUpperCase()}`,
            created_at: v.created_at
          });
        }
      });
    }

    const memberIds = Array.from(new Set(combinedData.map(t => t.member_id)));
    const { data: members } = await supabaseAdmin
      .from('members')
      .select('id, name')
      .in('id', memberIds);

    const memberMap: Record<string, string> = {};
    if (members) members.forEach(m => { memberMap[m.id] = m.name; });

    const enrichedData = combinedData
      .map(t => ({
        ...t,
        member_name: memberMap[t.member_id] || 'Unknown'
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ success: true, data: enrichedData });
  } catch (error: unknown) {
    console.error('POS Transactions GET Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
