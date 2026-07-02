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
        description: 'Annual Pass untuk 1 orang',
        price: 450000,
        type: 'SINGLE',
        min_qty: 1,
        max_qty: 1,
        is_active: true
      },
      {
        name: 'Family (3 pax)',
        description: 'Annual Pass untuk 3 anggota keluarga',
        price: 1325000,
        type: 'FAMILY',
        min_qty: 3,
        max_qty: 3,
        is_active: true
      },
      {
        name: 'Family (4 pax)',
        description: 'Annual Pass untuk 4 anggota keluarga',
        price: 1750000,
        type: 'FAMILY',
        min_qty: 4,
        max_qty: 4,
        is_active: true
      },
      {
        name: 'Family (5 pax)',
        description: 'Annual Pass untuk 5 anggota keluarga',
        price: 2000000,
        type: 'FAMILY',
        min_qty: 5,
        max_qty: 5,
        is_active: true
      },
      {
        name: 'Family (6 pax)',
        description: 'Annual Pass untuk 6 anggota keluarga',
        price: 2250000,
        type: 'FAMILY',
        min_qty: 6,
        max_qty: 6,
        is_active: true
      }
    ];

    const { data, error } = await supabaseAdmin.from('ticket_packages').insert(newPackages).select();
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
