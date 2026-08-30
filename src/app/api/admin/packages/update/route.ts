import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { AuditLogger } from '@/lib/AuditLogger';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, min_qty, max_qty, price, selected_wahanas } = body;

    if (!id || !name || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: pkgData, error: pkgError } = await supabaseAdmin.from('ticket_packages')
      .update({
        name,
        min_qty: Number(min_qty),
        max_qty: Number(max_qty),
        price: Number(price)
      })
      .eq('id', id)
      .select();

    if (pkgError || !pkgData || pkgData.length === 0) {
      return NextResponse.json({ error: pkgError?.message || 'Failed to update package' }, { status: 500 });
    }

    // Update package_wahanas
    // 1. Delete existing
    await supabaseAdmin.from('package_wahanas').delete().eq('package_id', id);

    // 2. Insert new
    if (selected_wahanas && Array.isArray(selected_wahanas) && selected_wahanas.length > 0) {
      const wahanasToInsert = selected_wahanas.map((w: any) => ({
        package_id: id,
        wahana_id: w.wahana_id,
        quantity: Number(w.quantity)
      }));
      
      const { error: wahanaError } = await supabaseAdmin.from('package_wahanas').insert(wahanasToInsert);
      
      if (wahanaError) {
        console.error("Failed to update package_wahanas:", wahanaError);
      }
    }

    await AuditLogger.log(request, 'UPDATE', 'PACKAGE', id, pkgData[0]);

    return NextResponse.json({ success: true, data: pkgData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
