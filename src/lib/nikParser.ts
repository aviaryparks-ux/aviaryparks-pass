// NIK Parser Utility
// Format NIK: P P C C D D  D D M M Y Y  S S S S
// P = Provinsi, C = Kota/Kab, D = Kecamatan
// DD MM YY = Tanggal Lahir (DD + 40 untuk wanita)
// S = Serial (Urutan)

export interface NIKData {
  isValid: boolean;
  province?: string;
  gender?: 'Laki-laki' | 'Perempuan';
  dateOfBirth?: Date;
  age?: number;
  birthdayThisMonth?: boolean;
}

const PROVINCES: Record<string, string> = {
  '11': 'Aceh', '12': 'Sumatera Utara', '13': 'Sumatera Barat', '14': 'Riau', '15': 'Jambi',
  '16': 'Sumatera Selatan', '17': 'Bengkulu', '18': 'Lampung', '19': 'Kepulauan Bangka Belitung', '21': 'Kepulauan Riau',
  '31': 'DKI Jakarta', '32': 'Jawa Barat', '33': 'Jawa Tengah', '34': 'DI Yogyakarta', '35': 'Jawa Timur', '36': 'Banten',
  '51': 'Bali', '52': 'Nusa Tenggara Barat', '53': 'Nusa Tenggara Timur',
  '61': 'Kalimantan Barat', '62': 'Kalimantan Tengah', '63': 'Kalimantan Selatan', '64': 'Kalimantan Timur', '65': 'Kalimantan Utara',
  '71': 'Sulawesi Utara', '72': 'Sulawesi Tengah', '73': 'Sulawesi Selatan', '74': 'Sulawesi Tenggara', '75': 'Gorontalo', '76': 'Sulawesi Barat',
  '81': 'Maluku', '82': 'Maluku Utara', '91': 'Papua Barat', '94': 'Papua'
};

export function parseNIK(nik: string): NIKData {
  if (!nik || nik.length !== 16 || !/^\d+$/.test(nik)) {
    return { isValid: false };
  }

  const provCode = nik.substring(0, 2);
  const dobStr = nik.substring(6, 12); // DDMMYY
  
  let day = parseInt(dobStr.substring(0, 2), 10);
  const month = parseInt(dobStr.substring(2, 4), 10);
  let year = parseInt(dobStr.substring(4, 6), 10);

  let gender: 'Laki-laki' | 'Perempuan' = 'Laki-laki';
  
  if (day > 40) {
    gender = 'Perempuan';
    day -= 40;
  }

  // Assuming century: if year > current year's last 2 digits, it's 1900s, else 2000s
  const currentYear = new Date().getFullYear();
  const currentYear2Digits = currentYear % 100;
  const fullYear = year > currentYear2Digits ? 1900 + year : 2000 + year;

  let dob: Date | undefined = undefined;
  let age: number | undefined = undefined;
  let birthdayThisMonth = false;

  try {
    dob = new Date(fullYear, month - 1, day);
    const today = new Date();
    
    // Calculate age
    age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    // Check if birthday is this month
    if (today.getMonth() === dob.getMonth()) {
      birthdayThisMonth = true;
    }
  } catch (e) {
    console.error("Error parsing date from NIK", nik);
  }

  return {
    isValid: true,
    province: PROVINCES[provCode] || 'Tidak diketahui',
    gender,
    dateOfBirth: dob,
    age,
    birthdayThisMonth
  };
}
