"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [nik, setNik] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      // Cari pengunjung berdasarkan kombinasi Email dan NIK
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('email', email)
        .eq('nik', nik)
        .limit(1)
        .single();

      if (error || !data) {
        setErrorMsg('Data tidak ditemukan. Pastikan Email dan NIK Anda sudah benar dan terdaftar.');
        setIsLoading(false);
        return;
      }

      // Login berhasil, simpan session ke localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('tempUserId', data.id);
        localStorage.setItem('tempUserName', data.name);
        localStorage.setItem('tempGroupId', data.group_id);
      }

      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan koneksi.');
      setIsLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem 0', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
      
      <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
         <Link href="/" style={{ color: 'var(--primary-dark)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           &larr; Kembali ke Home
         </Link>
      </div>

      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem 2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary-dark)' }}>Member Login</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem' }}>Masukkan detail Anda untuk mengakses Annual Pass Dashboard.</p>
        </div>

        {errorMsg && (
          <div style={{ background: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', border: '1px solid #fecaca' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155', fontSize: '0.875rem' }}>Alamat Email</label>
            <input 
              type="email" 
              required 
              placeholder="nama@email.com"
              style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155', fontSize: '0.875rem' }}>Nomor KTP (NIK)</label>
            <input 
              type="text" 
              required 
              placeholder="3201xxxxxxxxxxxx"
              style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem' }}
              value={nik}
              onChange={(e) => setNik(e.target.value)}
            />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Gunakan NIK Anda sebagai kata sandi login.</p>
          </div>
          
          <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
            {isLoading ? 'Memeriksa Data...' : 'Masuk ke Dasbor'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: '#64748b' }}>
          Belum punya tiket? <Link href="/register" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>Beli Annual Pass</Link>
        </div>
      </div>
    </div>
  );
}
