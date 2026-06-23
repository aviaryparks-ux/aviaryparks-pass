"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Infinity, ScanFace, Tag, Gift, User, Users, Plus, ChevronRight, Info, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export default function Register() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const [primary, setPrimary] = useState({ name: '', nik: '', phone: '', email: '', address: '' });
  const [members, setMembers] = useState<{name: string, nik: string, category: 'DEWASA' | 'ANAK'}[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await supabase.from('ticket_packages').select('*').eq('is_active', true).order('min_qty', { ascending: true });
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
      alert('Silakan pilih paket tiket terlebih dahulu di sebelah kiri.');
      return;
    }
    if (members.length >= selectedPkg.max_qty - 1) {
      alert(`Kapasitas maksimal untuk ${selectedPkg.name} adalah ${selectedPkg.max_qty} orang.`);
      return;
    }
    setMembers([...members, { name: '', nik: '', category: 'DEWASA' }]);
  };

  const removeMember = (index: number) => {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  const handleMemberChange = (index: number, field: 'name'|'nik'|'category', value: string) => {
    const newMembers = [...members];
    newMembers[index][field as any] = value;
    setMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!selectedPkg) {
        alert('Silakan pilih paket tiket terlebih dahulu sebelum melanjutkan.');
        setIsLoading(false);
        return;
      }
      
      const groupId = generateUUID();
      
      const insertData = [
        { 
          name: primary.name, 
          nik: primary.nik,
          phone: primary.phone, 
          email: primary.email, 
          address: primary.address,
          status: 'PENDING_PAYMENT',
          group_id: groupId,
          role: 'PRIMARY'
        },
        ...members.map(m => ({
          name: m.name,
          nik: m.nik,
          phone: primary.phone,
          email: primary.email,
          address: primary.address,
          status: 'PENDING_PAYMENT',
          group_id: groupId,
          role: m.category === 'ANAK' ? 'CHILD' : 'MEMBER'
        }))
      ];

      const { data, error } = await supabase
        .from('members')
        .insert(insertData)
        .select();

      if (error) {
        console.error("Supabase Error:", error);
        alert(`Gagal mendaftar ke database.\n\nPesan: ${error.message}\nDetail: ${error.details}\nPetunjuk: ${error.hint}`);
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('tempGroupId', groupId);
          localStorage.setItem('tempUserCount', insertData.length.toString());
          localStorage.setItem('tempUserName', primary.name);
          localStorage.setItem('tempPackageId', selectedPkg.id);
        }
        router.push('/payment');
      }
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f0fdf4', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Background Image */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        backgroundImage: 'url(/register_bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.8,
      }}></div>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        backgroundColor: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(2px)'
      }}></div>



      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        position: 'relative', 
        zIndex: 10, 
        display: 'flex', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        width: '100%',
        padding: '2rem',
        gap: '4rem',
        paddingBottom: '4rem'
      }}>
        
        {/* Left Column (Text & Features) */}
        <div style={{ flex: 1, color: '#0f172a', marginTop: '2rem' }}>
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
                        <p style={{ fontSize: '0.85rem', color: isSelected ? '#047857' : '#64748b', marginTop: '0.2rem' }}>
                          {pkg.min_qty === pkg.max_qty ? `Kapasitas: ${pkg.max_qty} Orang` : `Kapasitas: ${pkg.min_qty} - ${pkg.max_qty} Orang`}
                        </p>
                      </div>
                      <div style={{ fontWeight: '800', color: '#059669', fontSize: '1.1rem' }}>
                        Rp {Number(pkg.price).toLocaleString('id-ID')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Feature 1 */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '1rem', backgroundColor: '#d1fae5', borderRadius: '50%', color: '#059669' }}>
                <Infinity size={28} />
              </div>
              <div style={{ paddingTop: '0.3rem' }}>
                <h3 style={{ fontWeight: '700', fontSize: '1.05rem', marginBottom: '0.3rem' }}>Bebas Berkunjung</h3>
                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, maxWidth: '280px' }}>
                  Kunjungan <strong>unlimited</strong> selama 1 tahun dari tanggal aktivasi.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '1rem', backgroundColor: '#d1fae5', borderRadius: '50%', color: '#059669' }}>
                <ScanFace size={28} />
              </div>
              <div style={{ paddingTop: '0.3rem' }}>
                <h3 style={{ fontWeight: '700', fontSize: '1.05rem', marginBottom: '0.3rem' }}>Akses Cepat</h3>
                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, maxWidth: '280px' }}>
                  Masuk lebih cepat dengan Face Recognition.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '1rem', backgroundColor: '#d1fae5', borderRadius: '50%', color: '#059669' }}>
                <Tag size={28} />
              </div>
              <div style={{ paddingTop: '0.3rem' }}>
                <h3 style={{ fontWeight: '700', fontSize: '1.05rem', marginBottom: '0.3rem' }}>Hemat & Praktis</h3>
                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, maxWidth: '280px' }}>
                  Satu kali pembelian, banyak keuntungan.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '1rem', backgroundColor: '#d1fae5', borderRadius: '50%', color: '#059669' }}>
                <Gift size={28} />
              </div>
              <div style={{ paddingTop: '0.3rem' }}>
                <h3 style={{ fontWeight: '700', fontSize: '1.05rem', marginBottom: '0.3rem' }}>Keuntungan Eksklusif</h3>
                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, maxWidth: '280px' }}>
                  Dapatkan diskon khusus F&B, merchandise, dan event tertentu.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Form) */}
        <div style={{ flex: '0 0 550px' }}>
          <form onSubmit={handleSubmit} style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(10px)',
            borderRadius: '1.5rem', 
            padding: '2.5rem', 
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
                  <input type="text" placeholder="Masukkan nama lengkap sesuai KTP" required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem', outlineColor: '#059669' }} value={primary.name} onChange={(e) => setPrimary({ ...primary, name: e.target.value })} />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Nomor KTP (NIK)</label>
                  <input type="text" placeholder="Masukkan 16 digit nomor KTP" required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem', outlineColor: '#059669' }} value={primary.nik} onChange={(e) => setPrimary({ ...primary, nik: e.target.value })} />
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>Pastikan nomor KTP yang Anda masukkan benar.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>No. WhatsApp</label>
                    <input type="tel" placeholder="08xxxxxxxxxx" required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem', outlineColor: '#059669' }} value={primary.phone} onChange={(e) => setPrimary({ ...primary, phone: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Email</label>
                    <input type="email" placeholder="nama@email.com" required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem', outlineColor: '#059669' }} value={primary.email} onChange={(e) => setPrimary({ ...primary, email: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Alamat Lengkap</label>
                  <textarea placeholder="Masukkan alamat lengkap sesuai KTP" rows={3} required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem', outlineColor: '#059669', resize: 'vertical' }} value={primary.address} onChange={(e) => setPrimary({ ...primary, address: e.target.value })} />
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
                          <option value="ANAK">Anak/Bayi</option>
                        </select>
                      </div>
                      <div style={{ flex: '1 1 150px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>Nama Anggota {i+1}</label>
                        <input type="text" placeholder="Nama Lengkap" required style={{ width: '100%', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} value={m.name} onChange={(e) => handleMemberChange(i, 'name', e.target.value)} />
                      </div>
                      <div style={{ flex: '1 1 150px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>NIK KTP {m.category === 'ANAK' && '(Opsional)'}</label>
                        <input type="text" placeholder="16 Digit NIK" required={m.category === 'DEWASA'} style={{ width: '100%', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} value={m.nik} onChange={(e) => handleMemberChange(i, 'nik', e.target.value)} />
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

            {/* Submit Button */}
            <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '1.2rem', backgroundColor: '#059669', color: '#ffffff', borderRadius: '0.5rem', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', opacity: isLoading ? 0.7 : 1 }}>
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
      </main>
    </div>
  );
}
