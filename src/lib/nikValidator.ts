/**
 * NIK (Nomor Induk Kependudukan) Validator
 * Validasi 3 lapis: format, struktur tanggal lahir, & duplikasi
 */

// Kode provinsi yang valid di Indonesia (BPS)
const VALID_PROVINCE_CODES = new Set([
  '11','12','13','14','15','16','17','18','19', // Sumatera
  '21',                                          // Kepulauan Riau
  '31','32','33','34','35','36',                 // Jawa
  '51','52','53',                                // Bali & Nusa Tenggara
  '61','62','63','64','65',                      // Kalimantan
  '71','72','73','74','75','76',                 // Sulawesi
  '81','82',                                     // Maluku
  '91','92','94','95','96',                      // Papua
]);

export interface NikValidationResult {
  valid: boolean;
  error?: string;
}

export function validateNikFormat(nik: string): NikValidationResult {
  // 1. Harus angka semua
  if (!/^\d+$/.test(nik)) {
    return { valid: false, error: 'NIK hanya boleh berisi angka.' };
  }

  // 2. Harus tepat 16 digit
  if (nik.length !== 16) {
    return { valid: false, error: `NIK harus 16 digit (sekarang ${nik.length} digit).` };
  }

  // 3. Kode provinsi 2 digit pertama harus valid
  const provinceCode = nik.substring(0, 2);
  if (!VALID_PROVINCE_CODES.has(provinceCode)) {
    return { valid: false, error: 'Kode provinsi pada NIK tidak valid.' };
  }

  // 4. Validasi tanggal lahir (digit 7-12: DDMMYY)
  const dayPart = parseInt(nik.substring(6, 8), 10);
  const monthPart = parseInt(nik.substring(8, 10), 10);
  
  // Hari: laki-laki 01-31, perempuan 41-71 (hari + 40)
  const actualDay = dayPart > 40 ? dayPart - 40 : dayPart;
  if (actualDay < 1 || actualDay > 31) {
    return { valid: false, error: 'Tanggal lahir pada NIK tidak valid.' };
  }

  // Bulan: 01-12
  if (monthPart < 1 || monthPart > 12) {
    return { valid: false, error: 'Bulan lahir pada NIK tidak valid.' };
  }

  // 5. Nomor urut 4 digit terakhir tidak boleh 0000
  const seqNumber = nik.substring(12, 16);
  if (seqNumber === '0000') {
    return { valid: false, error: 'Nomor urut NIK tidak valid.' };
  }

  return { valid: true };
}

export async function checkNikDuplicate(nik: string, excludeNik?: string): Promise<boolean> {
  try {
    const res = await fetch('/api/check-nik', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nik, excludeNik }),
    });
    const data = await res.json();
    return data.exists === true;
  } catch {
    return false;
  }
}
