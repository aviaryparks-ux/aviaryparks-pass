import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { groupId, packageId, customerName, customerEmail, customerPhone, paymentMethod } = body;

    if (!groupId || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Hitung jumlah anggota berdasarkan group_id atau id member
    let { data: members, error: membersErr } = await supabaseAdmin
      .from('members')
      .select('id, name, email, phone, status')
      .or(`group_id.eq.${groupId},id.eq.${groupId}`);

    if (membersErr || !members || members.length === 0) {
      return NextResponse.json({ error: 'Data pendaftaran tidak ditemukan. Silakan ulangi pendaftaran.' }, { status: 400 });
    }

    // Filter pending members jika ada, jika tidak ada pakai data member yang ada
    const pendingMembers = members.filter(m => m.status === 'PENDING_PAYMENT');
    const targetMembers = pendingMembers.length > 0 ? pendingMembers : members;
    const actualUserCount = targetMembers.length;
    const firstMember = targetMembers[0];
    const finalCustName = customerName || firstMember.name || 'Pelanggan Aviary Park';
    const finalCustEmail = customerEmail || firstMember.email || 'no-email@example.com';
    const finalCustPhone = customerPhone || firstMember.phone || '081234567890';

    // Deteksi apakah ini penambahan anggota (Addon) dengan mengecek apakah sudah ada anggota yang ACTIVE
    const { data: activeMembers } = await supabaseAdmin
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
      const { data: exactPkg } = await supabaseAdmin
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
        const { data: addonPkg } = await supabaseAdmin
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
      const { data: pkgData, error: pkgErr } = await supabaseAdmin
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

    const totalAmountInt = Math.round(secureAmount);
    // MD5(merchantCode + merchantOrderId + paymentAmount + merchantKey)
    const signatureString = `${merchantCode}${uniqueOrderId}${totalAmountInt}${merchantKey}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    // Duitku API endpoint
    const endpoint = isSandbox
      ? 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry'
      : 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry';

    // Use a default callback URL if not set, but warn the user.
    const callbackUrl = process.env.DUITKU_CALLBACK_URL || 'https://www.aviarypark-test.com/api/payment/callback';
    
    // Gunakan NEXT_PUBLIC_BASE_URL dari env, atau Origin header sebagai fallback
    const origin = request.headers.get('origin');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/face-setup`;

    const payload = {
      merchantCode,
      paymentAmount: totalAmountInt,
      paymentMethod,
      merchantOrderId: uniqueOrderId,
      productDetails: packageName,
      email: finalCustEmail,
      customerVaName: finalCustName,
      phoneNumber: finalCustPhone,
      itemDetails: [
        {
          name: packageName.substring(0, 50),
          price: totalAmountInt,
          quantity: 1
        }
      ],
      customerDetail: {
        firstName: finalCustName,
        lastName: 'Aviary Park',
        email: finalCustEmail,
        phoneNumber: finalCustPhone
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
        buyer_name: finalCustName,
        package_name: packageName,
        amount: totalAmountInt,
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
      console.error('Duitku Online Error Response:', data);
      return NextResponse.json({
        success: false,
        error: data.statusMessage || 'Gateway error',
        details: data
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Payment Create Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
