"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function SystemLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Determine which area they are trying to access
  const isGate = callbackUrl.startsWith('/gate');
  const isAdmin = callbackUrl.startsWith('/admin');
  
  const roleName = isAdmin ? 'Super Admin' : (isGate ? 'Ticketing Gate' : 'Sistem Internal');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('system_users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) {
        setError('Username atau Password salah! (Pastikan tabel system_users sudah dibuat di Supabase)');
        setIsLoading(false);
        return;
      }

      // Check role mapping
      if (isAdmin && data.role !== 'ADMIN') {
        setError('Akses ditolak! Akun ini bukan Super Admin.');
        setIsLoading(false);
        return;
      }

      if (isGate && data.role !== 'GATE' && data.role !== 'ADMIN') {
        setError('Akses ditolak! Akun ini tidak memiliki akses Gate.');
        setIsLoading(false);
        return;
      }

      // Success
      if (isAdmin) {
        document.cookie = `auth_admin=true; path=/; max-age=86400`;
      } else if (isGate) {
        document.cookie = `auth_gate=true; path=/; max-age=86400`;
      }

      // Store username in localStorage for display in dashboard
      localStorage.setItem('system_username', data.username);
      localStorage.setItem('system_role', data.role);

      router.push(callbackUrl);
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan sistem.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '2rem' }}>
      <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '1rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="Aviary Park Logo" style={{ height: '50px', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>Otorisasi Sistem</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>Akses khusus untuk <strong style={{color: 'var(--primary-color)'}}>{roleName}</strong></p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', textAlign: 'center', border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>
              Username Akses
            </label>
            <input 
              type="text" 
              required 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username..."
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>
              Kata Sandi (Password)
            </label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi..."
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
            />
          </div>

          <button type="submit" disabled={isLoading} style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: isLoading ? 'not-allowed' : 'pointer', marginTop: '0.5rem', transition: 'background-color 0.2s', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Memeriksa...' : 'Buka Kunci Akses'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link href="/" style={{ color: '#94a3b8', fontSize: '0.875rem', textDecoration: 'none' }}>
            &larr; Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SystemLoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Memuat Sistem Otorisasi...</div>}>
      <SystemLoginForm />
    </Suspense>
  );
}
