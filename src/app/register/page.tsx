"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Infinity, ScanFace, Tag, Gift, User, Users, Plus, ChevronRight, Info, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import LanguageSelector from '../_components/LanguageSelector';

import indonesianCities from '@/lib/indonesian-cities.json';

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export default function Register() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // OTP verification state
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Consent states & Modals
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  const [primary, setPrimary] = useState({ name: '', birth_date: '', city: '', address: '', phone: '', email: '' });
  const [members, setMembers] = useState<{name: string, birth_date: string, category: 'DEWASA' | 'ANAK'}[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);

  // Rekomendasi Kota Populer Jabodetabek & Sekitarnya
  const popularCities = [
    "Tangerang Selatan", "Kota Tangerang", "Kabupaten Tangerang", 
    "Jakarta Selatan", "Jakarta Barat", "Jakarta Pusat", "Jakarta Timur", "Jakarta Utara",
    "Kota Depok", "Kota Bogor", "Kabupaten Bogor", "Kota Bekasi", "Kabupaten Bekasi",
    "Kota Bandung", "Kota Serang", "Kota Cilegon"
  ];
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  useEffect(() => {
    const fetchPackages = async () => {
      const res = await fetch('/api/public/packages?category=MEMBERSHIP');
      const json = await res.json();
      const data = json.data;
      if (data) setPackages(data);
    };
    fetchPackages();
  }, []);

  const handleSelectPackage = (pkg: any) => {
    setSelectedPkg(pkg);
    // If the user selects a smaller package, trim the members list
    if (members.length > pkg.max_qty - 1) {
      setMembers(members.slice(0, pkg.max_qty - 1));
    }
  };

  const addMember = () => {
    if (!selectedPkg) {
      toast.error('Silakan pilih paket tiket terlebih dahulu di sebelah kiri.');
      return;
    }
    if (members.length >= selectedPkg.max_qty - 1) {
      toast.error(`Maksimal anggota untuk paket ${selectedPkg.name} adalah ${selectedPkg.max_qty - 1} orang tambahan.`);
      return;
    }
    setMembers([...members, { name: '', birth_date: '', category: 'DEWASA' }]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: string, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!selectedPkg) {
        toast.error('Silakan pilih paket tiket terlebih dahulu sebelum melanjutkan.');
        setIsLoading(false);
        return;
      }

      if (!agreedTerms || !agreedPrivacy) {
        toast.error('Harap setujui Syarat & Ketentuan serta Kebijakan Privasi.');
        setIsLoading(false);
        return;
      }

      // Kirim OTP ke email/WhatsApp
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: primary.email, phone: primary.phone }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || 'Gagal mengirim kode verifikasi.');
        setIsLoading(false);
        return;
      }

      // Tampilkan step OTP
      setStep('otp');
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan koneksi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      setOtpError('Masukkan 6 digit kode OTP.');
      return;
    }
    if (!selectedPkg) {
      setOtpError('Paket tiket belum dipilih.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');

    try {
      // Gabungkan alamat & kota
      const fullAddress = primary.city ? `${primary.address ? primary.address + ', ' : ''}${primary.city}` : primary.address;

      // Siapkan data untuk insert di backend
      const groupId = generateUUID();
      const insertData = [
        {
          name: primary.name,
          birth_date: primary.birth_date || null,
          phone: primary.phone,
          email: primary.email,
          address: fullAddress,
          status: 'PENDING_PAYMENT',
          group_id: groupId,
          role: 'PRIMARY'
        },
        ...members.map(m => ({
          name: m.name,
          birth_date: m.birth_date || null,
          phone: primary.phone,
          email: primary.email,
          address: fullAddress,
          status: 'PENDING_PAYMENT',
          group_id: groupId,
          role: m.category === 'ANAK' ? 'CHILD' : 'MEMBER'
        }))
      ];

      // Verifikasi OTP & Insert via Backend
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: primary.email, otp: otpValue, insertData }),
      });

      const result = await res.json();
      if (!res.ok) {
        setOtpError(result.error || 'Terjadi kesalahan saat memverifikasi.');
        setOtpLoading(false);
        return;
      }

      // Berhasil diverifikasi dan disimpan
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tempUserId'); // Hapus sesi lama jika ada
        localStorage.setItem('tempGroupId', groupId);
        localStorage.setItem('tempUserCount', insertData.length.toString());
        localStorage.setItem('tempUserName', primary.name);
        localStorage.setItem('tempPackageId', selectedPkg.id);
      }
      router.push('/payment');
      
    } catch (err) {
      console.error(err);
      setOtpError('Terjadi kesalahan koneksi.');
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError('');
    setOtpValue('');
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: primary.email, phone: primary.phone }),
    });
    if (res.ok) {
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
  };


  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f0fdf4' }}>

      {/* OTP Verification Modal */}
      {step === 'otp' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '2.5rem 2rem',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            textAlign: 'center'
          }}>
            {/* Icon */}
            <div style={{ width: '64px', height: '64px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.25rem' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#064e3b', marginBottom: '0.5rem' }}>
              Verifikasi WhatsApp
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              Kode OTP 6 digit telah dikirim ke:
            </p>
            <p style={{ color: '#059669', fontWeight: '700', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
              {primary.phone}
            </p>

            {/* OTP Input */}
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="_ _ _ _ _ _"
              value={otpValue}
              onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '2rem',
                fontWeight: '800',
                textAlign: 'center',
                letterSpacing: '0.75rem',
                borderRadius: '12px',
                border: otpError ? '2px solid #ef4444' : '2px solid #e2e8f0',
                outline: 'none',
                marginBottom: '0.75rem',
                boxSizing: 'border-box',
                color: '#064e3b'
              }}
            />

            {otpError && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{otpError}</p>
            )}

            {/* Verify Button */}
            <style>{`
              @keyframes shimmer-otp {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
              }
              .otp-btn {
                background: linear-gradient(90deg, #059669, #34d399, #059669);
                background-size: 200% auto;
                animation: shimmer-otp 3s linear infinite;
              }
              .otp-btn:hover { transform: scale(1.02); }
            `}</style>
            <button
              onClick={handleVerifyOtp}
              disabled={otpLoading || otpValue.length !== 6}
              className={!otpLoading && otpValue.length === 6 ? 'otp-btn' : ''}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: '700',
                color: 'white',
                backgroundColor: (otpLoading || otpValue.length !== 6) ? '#94a3b8' : '#059669',
                border: 'none',
                borderRadius: '32px',
                cursor: (otpLoading || otpValue.length !== 6) ? 'not-allowed' : 'pointer',
                marginBottom: '1rem',
                transition: 'all 0.2s'
              }}
            >
              {otpLoading ? 'Memverifikasi...' : '✓ Verifikasi & Lanjutkan'}
            </button>

            {/* Resend & Back */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => { setStep('form'); setOtpValue(''); setOtpError(''); }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                ← Ubah Nomor WA
              </button>
              <button
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? '#94a3b8' : '#059669', fontSize: '0.85rem', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', fontWeight: '600' }}
              >
                {resendCooldown > 0 ? `Kirim ulang (${resendCooldown}s)` : 'Kirim Ulang OTP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header with Language Selector */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '1rem 2rem', display: 'flex', justifyContent: 'flex-end', zIndex: 100 }}>
        <LanguageSelector />
      </div>

      {/* Background Image */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        backgroundImage: 'url(/payment_bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 1,
      }}></div>




      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        position: 'relative', 
        zIndex: 10, 
        display: 'flex', 
        flexWrap: 'wrap',
        maxWidth: '1200px', 
        margin: '0 auto', 
        width: '100%',
        padding: '2rem',
        gap: '4rem',
        paddingBottom: '4rem'
      }}>
        
        {/* Left Column (Text & Features) */}
        <div style={{ flex: '1 1 300px', color: '#0f172a', marginTop: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', color: '#0f172a' }}>
            Daftar <span style={{ color: '#059669' }}>Annual Pass</span>
          </h1>
          <p style={{ color: '#475569', fontSize: '1.1rem', marginBottom: '3rem', maxWidth: '400px', lineHeight: 1.6 }}>
            Lengkapi data di bawah ini untuk membuat Annual Pass Anda. Harga akan menyesuaikan dengan jumlah anggota keluarga yang didaftarkan.
          </p>

          {packages.length > 0 && (
            <div style={{ marginBottom: '3rem', maxWidth: '450px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem', color: '#0f172a' }}>Pilih Paket Tiket</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {packages.map(pkg => {
                  const isSelected = selectedPkg?.id === pkg.id;
                  return (
                    <div 
                      key={pkg.id} 
                      onClick={() => handleSelectPackage(pkg)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        backgroundColor: isSelected ? '#dcfce7' : 'rgba(255,255,255,0.9)', 
                        padding: '1rem 1.5rem', 
                        borderRadius: '1rem', 
                        boxShadow: isSelected ? '0 0 0 2px #059669' : '0 4px 6px -1px rgba(0,0,0,0.05)', 
                        border: isSelected ? '1px solid #059669' : '1px solid rgba(5, 150, 105, 0.2)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <h4 style={{ fontWeight: '700', color: isSelected ? '#065f46' : '#0f172a' }}>{pkg.name}</h4>
                        <p style={{ fontSize: '0.85rem', color: isSelected ? '#047857' : '#64748b', marginTop: '0.2rem', marginBottom: '0.4rem' }}>
                          {pkg.min_qty === pkg.max_qty ? `Kapasitas: ${pkg.max_qty} Orang` : `Kapasitas: ${pkg.min_qty} - ${pkg.max_qty} Orang`}
                        </p>
                        {pkg.package_wahanas && pkg.package_wahanas.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                            {pkg.package_wahanas.map((pw: any, pidx: number) => (
                              <span 
                                key={pidx} 
                                style={{ 
                                  fontSize: '0.75rem', 
                                  fontWeight: '600', 
                                  backgroundColor: isSelected ? '#bbf7d0' : '#f1f5f9', 
                                  color: isSelected ? '#166534' : '#475569', 
                                  padding: '0.15rem 0.5rem', 
                                  borderRadius: '0.375rem',
                                  border: isSelected ? '1px solid #86efac' : '1px solid #e2e8f0'
                                }}
                              >
                                🎟️ {pw.wahanas?.name || 'Wahana'} x{pw.quantity}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: '800', color: '#059669', fontSize: '1.1rem', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                        Rp {Number(pkg.price).toLocaleString('id-ID')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Form) */}
        <div style={{ flex: '1 1 500px', minWidth: '300px', width: '100%' }}>
          <form onSubmit={handleSubmit} style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(10px)',
            borderRadius: '1.5rem', 
            padding: '1.5rem', 
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
          }}>
            
            {/* Section 1: Identitas Utama */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#d1fae5', borderRadius: '0.5rem', color: '#059669' }}>
                  <User size={20} />
                </div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Identitas Utama (Kepala Keluarga)</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Nama Lengkap</label>
                  <input type="text" placeholder="Masukkan nama lengkap Anda" required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem', outlineColor: '#059669' }} value={primary.name} onChange={(e) => setPrimary({ ...primary, name: e.target.value })} />
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>No. WhatsApp</label>
                    <input type="tel" placeholder="08xxxxxxxxxx" required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem', outlineColor: '#059669' }} value={primary.phone} onChange={(e) => setPrimary({ ...primary, phone: e.target.value })} />
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Email</label>
                    <input type="email" placeholder="nama@email.com" required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem', outlineColor: '#059669' }} value={primary.email} onChange={(e) => setPrimary({ ...primary, email: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Tanggal Lahir</label>
                    <input 
                      type="date" 
                      required 
                      style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem', outlineColor: '#059669' }} 
                      value={primary.birth_date} 
                      onChange={(e) => setPrimary({ ...primary, birth_date: e.target.value })} 
                    />
                  </div>
                  <div style={{ flex: '1 1 200px', position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Kota Domisili</label>
                    <input 
                      type="text" 
                      placeholder="Ketik nama kota..." 
                      required 
                      autoComplete="off"
                      style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem', outlineColor: '#059669' }} 
                      value={primary.city} 
                      onChange={(e) => {
                        setPrimary({ ...primary, city: e.target.value });
                        setShowCitySuggestions(true);
                      }} 
                      onFocus={() => {
                        if (primary.city.trim().length > 0) setShowCitySuggestions(true);
                      }}
                      onBlur={() => {
                        // Delay sedikit agar klik pada suggestion sempat teregister
                        setTimeout(() => setShowCitySuggestions(false), 200);
                      }}
                    />
                    
                    {/* Saran Kota - Hanya muncul jika user mulai mengetik */}
                    {showCitySuggestions && primary.city.trim().length > 0 && (
                      (() => {
                        const query = primary.city.toLowerCase().trim();
                        const filtered = (indonesianCities as string[])
                          .filter(c => c.toLowerCase().includes(query))
                          .slice(0, 8); // Tampilkan maksimal 8 saran terdekat agar tetap ringan & rapi

                        if (filtered.length === 0) return null;
                        return (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '0.35rem',
                            backgroundColor: '#ffffff',
                            borderRadius: '0.75rem',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                            maxHeight: '220px',
                            overflowY: 'auto',
                            zIndex: 50
                          }}>
                            {filtered.map((city, cIdx) => (
                              <div
                                key={cIdx}
                                onMouseDown={() => {
                                  setPrimary({ ...primary, city });
                                  setShowCitySuggestions(false);
                                }}
                                style={{
                                  padding: '0.65rem 1rem',
                                  fontSize: '0.9rem',
                                  color: '#1e293b',
                                  cursor: 'pointer',
                                  borderBottom: cIdx === filtered.length - 1 ? 'none' : '1px solid #f1f5f9',
                                  transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ecfdf5')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                {city}
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Alamat Detail</label>
                  <input type="text" placeholder="Jalan, Nomor Rumah / Komplek" required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem', outlineColor: '#059669' }} value={primary.address} onChange={(e) => setPrimary({ ...primary, address: e.target.value })} />
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />

            {/* Section 2: Anggota Keluarga */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: '#d1fae5', borderRadius: '0.5rem', color: '#059669' }}>
                    <Users size={20} />
                  </div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Anggota Keluarga ({members.length}/4)</h2>
                </div>
                <button type="button" onClick={addMember} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', backgroundColor: 'transparent', color: '#059669', border: '1px solid #059669', borderRadius: '2rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <Plus size={16} strokeWidth={3} /> Tambah Anggota
                </button>
              </div>

              {members.length === 0 ? (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={addMember}>
                  <div style={{ padding: '0.8rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', color: '#475569' }}>
                    <Users size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b' }}>Belum ada anggota keluarga</h4>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.1rem' }}>Tambahkan anggota keluarga untuk melanjutkan pendaftaran.</p>
                  </div>
                  <ChevronRight size={20} color="#94a3b8" />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {members.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 120px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>Kategori</label>
                        <select style={{ width: '100%', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: 'white' }} value={m.category} onChange={(e) => handleMemberChange(i, 'category', e.target.value)}>
                          <option value="DEWASA">Dewasa</option>
                          <option value="ANAK">Anak / Bayi</option>
                        </select>
                      </div>
                      <div style={{ flex: '2 1 180px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>Nama Anggota {i+1}</label>
                        <input type="text" placeholder="Masukkan nama lengkap" required style={{ width: '100%', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} value={m.name} onChange={(e) => handleMemberChange(i, 'name', e.target.value)} />
                      </div>
                      <div style={{ flex: '1.5 1 150px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>Tanggal Lahir</label>
                        <input type="date" required style={{ width: '100%', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} value={m.birth_date} onChange={(e) => handleMemberChange(i, 'birth_date', e.target.value)} />
                      </div>
                      <button type="button" onClick={() => removeMember(i)} style={{ padding: '0.7rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Info Alert */}
              <div style={{ marginTop: '1.5rem', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '0.5rem', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ color: '#059669', marginTop: '0.1rem' }}><Info size={18} /></div>
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#059669', marginBottom: '0.25rem' }}>Informasi Kapasitas</h4>
                  <p style={{ fontSize: '0.85rem', color: '#065f46', lineHeight: 1.4 }}>Batas jumlah anggota keluarga akan menyesuaikan dengan <strong>Paket Tiket</strong> yang Anda pilih di sebelah kiri.</p>
                </div>
              </div>
            </div>

            {/* Section 3: Persetujuan (ISO 27001 / UU PDP Compliance) */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Persetujuan Ketentuan Layanan</h4>
              
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={agreedTerms} 
                  onChange={(e) => setAgreedTerms(e.target.checked)} 
                  required 
                  style={{ marginTop: '0.2rem', accentColor: '#059669', width: '17px', height: '17px', flexShrink: 0 }}
                />
                <span>
                  Saya menyetujui{' '}
                  <button 
                    type="button" 
                    onClick={() => setShowTermsModal(true)} 
                    style={{ background: 'none', border: 'none', padding: 0, color: '#059669', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}
                  >
                    Syarat & Ketentuan
                  </button>{' '}
                  Annual Pass Aviary Park (kartu bersifat personal & tidak dapat dipindahtangankan).
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={agreedPrivacy} 
                  onChange={(e) => setAgreedPrivacy(e.target.checked)} 
                  required 
                  style={{ marginTop: '0.2rem', accentColor: '#059669', width: '17px', height: '17px', flexShrink: 0 }}
                />
                <span>
                  Saya menyetujui{' '}
                  <button 
                    type="button" 
                    onClick={() => setShowPrivacyModal(true)} 
                    style={{ background: 'none', border: 'none', padding: 0, color: '#059669', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}
                  >
                    Kebijakan Privasi
                  </button>{' '}
                  terkait enkripsi data & pemrosesan biometrik wajah untuk verifikasi gate masuk.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading || !agreedTerms || !agreedPrivacy} 
              style={{ 
                width: '100%', 
                padding: '1.2rem', 
                backgroundColor: '#059669', 
                color: '#ffffff', 
                borderRadius: '0.5rem', 
                border: 'none', 
                fontWeight: '700', 
                fontSize: '1rem', 
                cursor: (isLoading || !agreedTerms || !agreedPrivacy) ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginTop: '0.5rem', 
                opacity: (isLoading || !agreedTerms || !agreedPrivacy) ? 0.6 : 1 
              }}
            >
              {isLoading ? 'Memproses...' : `Lanjut ke Pembayaran (${members.length + 1} Orang)`}
              {!isLoading && <ArrowRight size={18} />}
            </button>
            
          </form>

          {/* Security Badge */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', color: '#475569', fontSize: '0.85rem' }}>
            <Lock size={14} color="#059669" />
            <span>Data Anda aman dan terlindungi dengan enkripsi tingkat tinggi.</span>
          </div>

        </div>

        {/* Bottom Full-Width Section: Benefit Strip (Horizontal Inline) */}
        <div style={{ width: '100%', marginTop: '1.5rem' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '1rem',
            width: '100%'
          }}>
            {[
              { icon: <Infinity size={18} />, title: 'Bebas Berkunjung', desc: 'Akses tak terbatas setahun' },
              { icon: <ScanFace size={18} />, title: 'Face Recognition', desc: 'Masuk praktis dengan wajah' },
              { icon: <Tag size={18} />, title: 'Hemat 40%', desc: 'Bandingkan tiket reguler' },
              { icon: <Users size={18} />, title: 'Untuk Keluarga', desc: 'Nikmati kebersamaan bersama' },
            ].map((f, i) => (
              <div 
                key={i} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.875rem', 
                  background: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(10px)',
                  padding: '0.75rem 1rem', 
                  borderRadius: '0.875rem', 
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ 
                  width: '34px', 
                  height: '34px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backgroundColor: '#ecfdf5', 
                  borderRadius: '0.5rem', 
                  color: '#059669',
                  flexShrink: 0
                }}>
                  {f.icon}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <h4 style={{ fontWeight: '700', fontSize: '0.85rem', color: '#059669', margin: 0, whiteSpace: 'nowrap' }}>{f.title}</h4>
                  <p style={{ fontSize: '0.725rem', color: '#64748b', margin: '0.1rem 0 0 0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Modal Syarat & Ketentuan */}
      {showTermsModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Syarat & Ketentuan Membership</h3>
              <button 
                onClick={() => setShowTermsModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <strong style={{ color: '#0f172a' }}>1. Kepemilikan & Sifat Personal</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#475569' }}>
                  Kartu Annual Pass Aviary Park bersifat <strong>personal, mengikat data biometrik individu, dan tidak dapat dipindahtangankan</strong> atau dipinjamkan kepada orang lain dengan alasan apa pun.
                </p>
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>2. Masa Berlaku</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#475569' }}>
                  Keanggotaan berlaku selama 365 hari (1 tahun penuh) sejak tanggal transaksi pembayaran berhasil diverifikasi oleh sistem.
                </p>
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>3. Akses Wahana & Fasilitas</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#475569' }}>
                  Akses masuk ke area Aviary Park bebas setiap hari operasional. Kuota tiket wahana gratis (misal: Mini Train, Bird Feeding) akan diberikan sesuai paket membership yang dipilih.
                </p>
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>4. Ketentuan Pengembalian (Refund)</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#475569' }}>
                  Biaya keanggotaan Annual Pass yang telah dibayarkan tidak dapat dikembalikan (non-refundable) baik sebagian maupun seluruhnya.
                </p>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
              <button
                onClick={() => { setShowTermsModal(false); setAgreedTerms(true); }}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  padding: '0.65rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Saya Mengerti & Setuju
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kebijakan Privasi */}
      {showPrivacyModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Kebijakan Privasi & Perlindungan Data</h3>
              <button 
                onClick={() => setShowPrivacyModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <strong style={{ color: '#0f172a' }}>1. Standar Keamanan (ISO 27001 & UU PDP)</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#475569' }}>
                  Kami berkomitmen melindungi privasi pengunjung sesuai dengan <strong>UU Perlindungan Data Pribadi (UU PDP No. 27/2022)</strong> dan standar ISO/IEC 27001. Kami menerapkan prinsip minimalisasi data (tanpa mewajibkan nomor KTP/NIK).
                </p>
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>2. Pemrosesan Biometrik Wajah</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#475569' }}>
                  Foto wajah yang Anda daftarkan hanya dikonversi menjadi representasi vektor numerik matematis (vektor 512 dimensi terenkripsi) untuk tujuan pencocokan akses otomatis pada gerbang masuk (turnstile gate).
                </p>
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>3. Keamanan & Kerahasiaan Data</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#475569' }}>
                  Data profil Anda (nama, nomor kontak WhatsApp, dan tanggal lahir) disimpan dengan enkripsi tingkat tinggi dan tidak akan pernah dijual atau dibagikan kepada pihak ketiga di luar kepatuhan hukum yang berlaku.
                </p>
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>4. Hak Subjek Data</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#475569' }}>
                  Anda berhak meminta pembaruan informasi profil atau penonaktifan data biometrik Anda kapan saja melalui permohonan resmi ke Customer Service Aviary Park.
                </p>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
              <button
                onClick={() => { setShowPrivacyModal(false); setAgreedPrivacy(true); }}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  padding: '0.65rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Saya Mengerti & Setuju
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
