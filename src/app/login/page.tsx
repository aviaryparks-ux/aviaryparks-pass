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
    <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Background Image */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/payment_bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }}></div>

      {/* 3D Trapezoid Logo Tab */}
      <div style={{ 
        position: 'absolute', 
        top: 0,
        left: '3rem',
        padding: '1rem 2rem 1.5rem 2rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#f0fdf4',
          transform: 'perspective(150px) rotateX(-10deg)',
          transformOrigin: 'top',
          borderBottomLeftRadius: '1.5rem',
          borderBottomRightRadius: '1.5rem',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          zIndex: -1
        }}></div>
        <img src="/logo.png" alt="Aviary Park Logo" style={{ height: '70px', objectFit: 'contain' }} />
      </div>



      {/* Centered Login Card */}
      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
        <div style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '24px', 
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', 
          maxWidth: '420px', 
          width: '100%', 
          padding: '2.5rem 2rem'
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#064e3b', marginBottom: '0.5rem' }}>Member Login</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Masukkan detail Anda untuk mengakses Annual Pass Dashboard.</p>
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
                style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box', outline: 'none' }}
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
                style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box', outline: 'none' }}
                value={nik}
                onChange={(e) => setNik(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Gunakan NIK Anda sebagai kata sandi login.</p>
            </div>

            <style>{`
              @keyframes shimmer-login {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
              }
              .login-btn {
                background: linear-gradient(90deg, #059669, #34d399, #059669);
                background-size: 200% auto;
                animation: shimmer-login 3s linear infinite;
                transition: all 0.3s ease;
              }
              .login-btn:hover {
                transform: scale(1.02);
                box-shadow: 0 8px 30px rgba(5, 150, 105, 0.5);
              }
            `}</style>

            <button 
              type="submit" 
              disabled={isLoading}
              className={!isLoading ? 'login-btn' : ''}
              style={{ 
                marginTop: '0.5rem', 
                padding: '1rem', 
                fontSize: '1.1rem', 
                fontWeight: '700',
                color: 'white',
                backgroundColor: isLoading ? '#94a3b8' : '#059669',
                border: 'none',
                borderRadius: '32px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: isLoading ? 'none' : '0 4px 12px rgba(5,150,105,0.3)'
              }}
            >
              {isLoading ? 'Memeriksa Data...' : 'Masuk ke Dasbor'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            Belum punya tiket? <Link href="/register" style={{ color: '#059669', fontWeight: 'bold' }}>Beli Annual Pass</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
