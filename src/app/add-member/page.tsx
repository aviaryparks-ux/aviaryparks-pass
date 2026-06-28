"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AddMemberPage() {
  const router = useRouter();
  const [groupId, setGroupId] = useState('');
  const [members, setMembers] = useState([{ name: '', nik: '', role: 'ANAK' }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tempGroupId');
      if (stored) {
        setGroupId(stored);
      } else {
        toast.error('Sesi login tidak valid.');
        router.push('/');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    setLoading(true);

    try {
      // Siapkan array data untuk di-insert
      const membersToInsert = members.map(m => ({
        group_id: groupId,
        name: m.name,
        nik: m.nik,
        role: m.role,
        status: 'PENDING_PAYMENT'
      }));

      // Insert semua new member sekaligus
      const { error } = await supabase.from('members').insert(membersToInsert);

      if (error) {
        toast.error('Gagal menambahkan anggota: ' + error.message);
        setLoading(false);
        return;
      }

      // Berhasil, arahkan ke halaman pembayaran tagihan tambahan
      router.push('/payment');
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '400px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>Tambah Anggota Baru</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          Data anggota tambahan akan ditagihkan secara terpisah.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {members.map((member, index) => (
            <div key={index} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '0.5rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#334155' }}>Anggota {index + 1}</h3>
                {members.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => {
                      const newMembers = [...members];
                      newMembers.splice(index, 1);
                      setMembers(newMembers);
                    }}
                    style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold' }}
                  >
                    Hapus
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Nama Lengkap</label>
                  <input 
                    type="text" 
                    required 
                    value={member.name} 
                    onChange={(e) => {
                      const newMembers = [...members];
                      newMembers[index].name = e.target.value;
                      setMembers(newMembers);
                    }} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} 
                    placeholder="Masukkan nama"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>NIK</label>
                  <input 
                    type="text" 
                    required 
                    value={member.nik} 
                    onChange={(e) => {
                      const newMembers = [...members];
                      newMembers[index].nik = e.target.value;
                      setMembers(newMembers);
                    }} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} 
                    placeholder="Masukkan NIK KTP/KIA"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Peran/Hubungan</label>
                  <select 
                    value={member.role} 
                    onChange={(e) => {
                      const newMembers = [...members];
                      newMembers[index].role = e.target.value;
                      setMembers(newMembers);
                    }} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white' }}
                  >
                    <option value="SUAMI">Suami</option>
                    <option value="ISTRI">Istri</option>
                    <option value="ANAK">Anak</option>
                    <option value="SAUDARA">Saudara/Lainnya</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button 
            type="button" 
            onClick={() => setMembers([...members, { name: '', nik: '', role: 'ANAK' }])}
            style={{ 
              padding: '0.75rem', 
              backgroundColor: 'transparent', 
              color: '#3b82f6', 
              border: '2px dashed #93c5fd', 
              borderRadius: '0.5rem', 
              fontWeight: 'bold', 
              cursor: 'pointer' 
            }}
          >
            + Tambah Anggota Lainnya
          </button>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              backgroundColor: loading ? '#94a3b8' : '#10b981', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.5rem', 
              fontWeight: 'bold', 
              cursor: loading ? 'not-allowed' : 'pointer' 
            }}
          >
            {loading ? 'Memproses...' : 'Lanjutkan ke Pembayaran'}
          </button>

          <Link href="/dashboard" style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem', textDecoration: 'none', marginTop: '0.5rem' }}>
            Batal & Kembali
          </Link>
        </form>
      </div>
    </div>
  );
}
