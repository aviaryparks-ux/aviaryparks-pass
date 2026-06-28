import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateNikFormat } from '@/lib/nikValidator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, otp, insertData } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email dan OTP diperlukan.' }, { status: 400 });
    }

    // 1. Cari OTP yang valid
    const { data: otpData, error: otpError } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return NextResponse.json(
        { error: 'Kode OTP salah atau sudah kadaluarsa.' },
        { status: 400 }
      );
    }

    // 2. Jika ada insertData, lakukan validasi & insert di backend
    if (insertData && Array.isArray(insertData)) {
      // Validasi NIK dan persiapkan data untuk insert
      const processedData = [];
      const niksToCheck = [];

      for (const member of insertData) {
        let finalNik = member.nik;

        // Kosongkan NIK jika hanya string kosong (terutama untuk ANAK)
        if (!finalNik || finalNik.trim() === '') {
          finalNik = null;
        }

        if (finalNik) {
          const fmt = validateNikFormat(finalNik);
          if (!fmt.valid) {
            return NextResponse.json({ error: `Format NIK tidak valid untuk ${member.name}: ${fmt.error}` }, { status: 400 });
          }
          niksToCheck.push(finalNik);
        }

        processedData.push({
          ...member,
          nik: finalNik
        });
      }

      // Cek duplikasi NIK di DB
      if (niksToCheck.length > 0) {
        const { data: existingNiks, error: nikCheckError } = await supabase
          .from('members')
          .select('nik')
          .in('nik', niksToCheck);

        if (nikCheckError) {
          throw nikCheckError;
        }

        if (existingNiks && existingNiks.length > 0) {
          return NextResponse.json({ error: 'Satu atau lebih NIK sudah terdaftar dalam sistem.' }, { status: 400 });
        }
      }

      // Lakukan insert secara aman menggunakan service role key
      const { error: insertError } = await supabase.from('members').insert(processedData);

      if (insertError) {
        console.error('Insert Error:', insertError);
        return NextResponse.json({ error: `Gagal menyimpan data pendaftaran: ${insertError.message}` }, { status: 500 });
      }
    }

    // 3. Tandai OTP sebagai sudah digunakan
    await supabase.from('email_otps').update({ used: true }).eq('id', otpData.id);

    return NextResponse.json({ success: true, message: 'Verifikasi berhasil dan data telah disimpan.' });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
