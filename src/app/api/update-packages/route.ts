import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  try {
    // 1. Delete all existing packages
    await supabaseAdmin.from('ticket_packages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // 2. Insert new packages
    const newPackages = [
      {
        name: 'Single',
        price: 450000,
        min_qty: 1,
        max_qty: 1,
        is_active: true
      },
      {
        name: 'Family (3 pax)',
        price: 1325000,
        min_qty: 3,
        max_qty: 3,
        is_active: true
      },
      {
        name: 'Family (4 pax)',
        price: 1750000,
        min_qty: 4,
        max_qty: 4,
        is_active: true
      },
      {
        name: 'Family (5 pax)',
        price: 2000000,
        min_qty: 5,
        max_qty: 5,
        is_active: true
      },
      {
        name: 'Family (6 pax)',
        price: 2250000,
        min_qty: 6,
        max_qty: 6,
        is_active: true
      }
    ];

    const { data, error } = await supabaseAdmin.from('ticket_packages').insert(newPackages).select();
    if (error) {
      console.error('Insert error:', error.message, error.details, error.code);
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
