import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/admin/settings/vouchers
// Fetch current voucher settings
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isSync = searchParams.get('sync') === 'true';

    if (isSync) {
      // 1. Ambil seluruh paket membership beserta bonus wahana bawaannya
      const { data: pkgs } = await supabaseAdmin
        .from('ticket_packages')
        .select('id, name, package_wahanas(wahana_id, quantity, wahanas(name))')
        .eq('is_active', true);

      // 2. Ambil seluruh member aktif
      const { data: members } = await supabaseAdmin
        .from('members')
        .select('id, name, group_id, status, role')
        .eq('status', 'ACTIVE');

      // 3. Ambil transaksi yang lunas untuk melihat paket masing-masing member
      const { data: transactions } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .in('status', ['PAID', 'SUCCESS', 'COMPLETED']);

      const results = [];

      if (members && members.length > 0 && pkgs && pkgs.length > 0) {
        for (const m of members) {
          const trx = transactions?.find(t => t.group_id === m.group_id || t.group_id === m.id);
          const pkgName = trx?.package_name || 'Single';

          const matchedPkg = pkgs.find(p => 
            p.name.toLowerCase().trim() === pkgName.toLowerCase().trim() ||
            pkgName.toLowerCase().includes(p.name.toLowerCase()) ||
            p.name.toLowerCase().includes(pkgName.toLowerCase())
          ) || pkgs[0];

          if (matchedPkg && matchedPkg.package_wahanas && matchedPkg.package_wahanas.length > 0) {
            const validityDays = 365;
            const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

            for (const pw of matchedPkg.package_wahanas) {
              const { data: existing } = await supabaseAdmin
                .from('member_wahana_vouchers')
                .select('id, quota')
                .eq('member_id', m.id)
                .eq('wahana_id', pw.wahana_id)
                .single();

              if (existing) {
                if (existing.quota < pw.quantity) {
                  await supabaseAdmin
                    .from('member_wahana_vouchers')
                    .update({ quota: pw.quantity, valid_until: expiresAt })
                    .eq('id', existing.id);
                  results.push({ member: m.name, wahana_id: pw.wahana_id, updated: true, quota: pw.quantity });
                }
              } else {
                await supabaseAdmin
                  .from('member_wahana_vouchers')
                  .insert({
                    member_id: m.id,
                    wahana_id: pw.wahana_id,
                    quota: pw.quantity,
                    valid_until: expiresAt
                  });
                results.push({ member: m.name, wahana_id: pw.wahana_id, inserted: true, quota: pw.quantity });
              }
            }
          }
        }
      }

      return NextResponse.json({ success: true, synced: results });
    }

    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .eq('id', 'wahana_vouchers')
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        // Return default structure if it doesn't exist yet
        return NextResponse.json({
          initial_amount: 5,
          price_per_voucher: 50000,
          validity_days: 30
        });
      }
      throw error;
    }

    return NextResponse.json(data.value);
  } catch (error: any) {
    console.error('Error fetching voucher settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/settings/vouchers
// Update voucher settings
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Ensure all required fields exist
    if (typeof body.initial_amount !== 'number' || 
        typeof body.price_per_voucher !== 'number' || 
        typeof body.validity_days !== 'number') {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert({
        id: 'wahana_vouchers',
        value: {
          initial_amount: body.initial_amount,
          price_per_voucher: body.price_per_voucher,
          validity_days: body.validity_days
        },
        description: 'Pengaturan default untuk voucher wahana (kuota awal, harga top-up, masa aktif)',
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Pengaturan berhasil disimpan' });
  } catch (error: any) {
    console.error('Error saving voucher settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
