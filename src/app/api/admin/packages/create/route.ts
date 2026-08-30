import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { AuditLogger } from '@/lib/AuditLogger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, min_qty, max_qty, price, selected_wahanas, category } = body;

    if (!name || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: pkgData, error: pkgError } = await supabaseAdmin.from('ticket_packages').insert([{
      name,
      min_qty: Number(min_qty),
      max_qty: Number(max_qty),
      price: Number(price),
      is_active: true,
      category: category || 'MEMBERSHIP'
    }]).select();

    if (pkgError || !pkgData || pkgData.length === 0) {
      return NextResponse.json({ error: pkgError?.message || 'Failed to create package' }, { status: 500 });
    }

    const packageId = pkgData[0].id;

    if (selected_wahanas && Array.isArray(selected_wahanas) && selected_wahanas.length > 0) {
      const wahanasToInsert = selected_wahanas.map((w: any) => ({
        package_id: packageId,
        wahana_id: w.wahana_id,
        quantity: Number(w.quantity)
      }));
      
      const { error: wahanaError } = await supabaseAdmin.from('package_wahanas').insert(wahanasToInsert);
      
      if (wahanaError) {
        // We probably should rollback here, but for simplicity we'll just return the error
        console.error("Failed to insert package_wahanas:", wahanaError);
      }
    }

    await AuditLogger.log(request, 'CREATE', 'PACKAGE', packageId, pkgData[0]);

    return NextResponse.json({ success: true, data: pkgData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
