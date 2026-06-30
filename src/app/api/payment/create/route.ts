import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { groupId, packageId, customerName, customerEmail, customerPhone, paymentMethod } = body;

    if (!groupId || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Hitung jumlah anggota yang BELUM lunas saja (PENDING_PAYMENT)
    const { data: members, error: membersErr } = await supabase
      .from('members')
      .select('id')
      .eq('group_id', groupId)
      .eq('status', 'PENDING_PAYMENT');

    if (membersErr || !members || members.length === 0) {
      return NextResponse.json({ error: 'Group ID tidak ditemukan atau kosong' }, { status: 400 });
    }

    const actualUserCount = members.length;

    // Deteksi apakah ini penambahan anggota (Addon) dengan mengecek apakah sudah ada anggota yang ACTIVE
    const { data: activeMembers } = await supabase
      .from('members')
      .select('id')
      .eq('group_id', groupId)
      .eq('status', 'ACTIVE')
      .limit(1);
      
    const isAddonTransaction = activeMembers && activeMembers.length > 0;

    let secureAmount = 150000 * actualUserCount; // Fallback normal price
    let packageFound = false;
    let packageName = 'Tiket Standar Aviary Park';

    // 2. Tentukan harga asli berdasarkan database
    if (packageId) {
      const { data: exactPkg } = await supabase
        .from('ticket_packages')
        .select('*')
        .eq('id', packageId)
        .single();
        
      if (exactPkg) {
        // Jika nama paket mengandung "addon" atau "tambahan", kalikan dengan jumlah orang (seperti di frontend)
        const isAddonPkg = exactPkg.name.toLowerCase().includes('addon') || exactPkg.name.toLowerCase().includes('tambahan');
        secureAmount = isAddonPkg ? Number(exactPkg.price) * actualUserCount : Number(exactPkg.price);
        packageName = exactPkg.name;
        packageFound = true;
      }
    }

    if (!packageFound) {
      if (isAddonTransaction) {
        // Cari paket yang namanya mengandung Addon atau Tambahan
        const { data: addonPkg } = await supabase
          .from('ticket_packages')
          .select('*')
          .eq('is_active', true)
          .or('name.ilike.%addon%,name.ilike.%tambahan%')
          .limit(1)
          .single();
          
        if (addonPkg) {
          secureAmount = Number(addonPkg.price) * actualUserCount;
          packageFound = true;
          packageName = addonPkg.name;
        }
      }
    }

    // Jika bukan addon, atau paket addon tidak ditemukan, cari berdasarkan kapasitas
    if (!packageFound) {
      const { data: pkgData, error: pkgErr } = await supabase
        .from('ticket_packages')
        .select('*')
        .eq('is_active', true)
        .lte('min_qty', actualUserCount)
        .gte('max_qty', actualUserCount)
        .limit(1)
        .single();

      if (pkgData && !pkgErr) {
        secureAmount = Number(pkgData.price);
        packageName = pkgData.name;
      }
    }

    const merchantCode = process.env.NEXT_PUBLIC_DUITKU_MERCHANT_CODE || '';
    const merchantKey = process.env.DUITKU_MERCHANT_KEY || '';
    const isSandbox = process.env.DUITKU_ENV === 'sandbox';

    // Duitku Order IDs MUST be unique per transaction.
    // Jika kita pakai groupId tok, Duitku akan menolak transaksi kedua dengan pesan "Order ID already exists".
    // Maka kita tambahkan timestamp di belakangnya: groupId-timestamp
    const uniqueOrderId = `${groupId}-${Date.now()}`;

    // MD5(merchantCode + merchantOrderId + paymentAmount + merchantKey)
    const signatureString = `${merchantCode}${uniqueOrderId}${secureAmount}${merchantKey}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    // Duitku API endpoint
    const endpoint = isSandbox
      ? 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry'
      : 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry';

    // Use a default callback URL if not set, but warn the user.
    // Duitku might require HTTPS for callback URL even in sandbox.
    const callbackUrl = process.env.DUITKU_CALLBACK_URL || 'https://www.aviarypark-test.com/api/payment/callback';
    
    // Gunakan NEXT_PUBLIC_BASE_URL dari env, bukan dari Origin header
    // (Origin header bisa dimanipulasi oleh attacker)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/face-setup`;

    const payload = {
      merchantCode,
      paymentAmount: secureAmount,
      paymentMethod,
      merchantOrderId: uniqueOrderId,
      productDetails: 'Tiket Aviary Park',
      email: customerEmail || 'no-email@example.com',
      customerVaName: customerName || 'Pelanggan Aviary Park',
      phoneNumber: customerPhone || '081234567890',
      itemDetails: [
        {
          name: 'Paket Tiket Aviary Park',
          price: secureAmount,
          quantity: 1
        }
      ],
      customerDetail: {
        firstName: customerName || 'Pelanggan',
        lastName: 'Aviary Park',
        email: customerEmail || 'no-email@example.com',
        phoneNumber: customerPhone || '081234567890'
      },
      callbackUrl,
      returnUrl,
      signature,
      expiryPeriod: 60 // 60 minutes
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.statusCode === '00') {
      // Create transaction record
      const { error: trxError } = await supabaseAdmin.from('transactions').insert({
        group_id: groupId,
        merchant_order_id: uniqueOrderId,
        buyer_name: customerName || 'Pelanggan',
        package_name: packageName,
        amount: secureAmount,
        status: 'PENDING',
        payment_method: paymentMethod
      });
      if (trxError) console.error("Error creating transaction record:", trxError);

      return NextResponse.json({
        success: true,
        paymentUrl: data.paymentUrl,
        reference: data.reference,
        merchantOrderId: uniqueOrderId
      });
    } else {
      console.error('Duitku Error Response:', data);
      return NextResponse.json({
        success: false,
        error: data.statusMessage,
        details: data
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Payment Create Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
