import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: members, error } = await supabaseAdmin
      .from('members')
      .select('*, member_wahana_vouchers(wahana_id, quota)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Auto-Sync: Jika ada member aktif yang belum menerima kuota voucher paket bawaan, alokasikan sekarang
    if (members && members.length > 0) {
      const { data: pkgs } = await supabaseAdmin
        .from('ticket_packages')
        .select('id, name, package_wahanas(wahana_id, quantity)')
        .eq('is_active', true);

      for (const m of members) {
        const totalVouchers = m.member_wahana_vouchers?.reduce((sum: number, v: any) => sum + (v.quota || 0), 0) || 0;
        if (m.status === 'ACTIVE' && totalVouchers === 0 && pkgs && pkgs.length > 0) {
          const singlePkg = pkgs.find((p: any) => p.name.toLowerCase().includes('single')) || pkgs[0];
          if (singlePkg && singlePkg.package_wahanas && singlePkg.package_wahanas.length > 0) {
            const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
            for (const pw of singlePkg.package_wahanas) {
              await supabaseAdmin.from('member_wahana_vouchers').insert({
                member_id: m.id,
                wahana_id: pw.wahana_id,
                quota: pw.quantity,
                valid_until: expiresAt
              });
            }
          }
        }
      }
    }

    const { data: finalMembers } = await supabaseAdmin
      .from('members')
      .select('*, member_wahana_vouchers(wahana_id, quota)')
      .order('created_at', { ascending: false });
    
    return NextResponse.json({ success: true, data: finalMembers || members });
  } catch (error: any) {
    console.error('Error fetching admin members:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch members' }, { status: 500 });
  }
}
