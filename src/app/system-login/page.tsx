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
  const [showPassword, setShowPassword] = useState(false);
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          callbackUrl
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal login. Periksa username dan password.');
        setIsLoading(false);
        return;
      }

      // Store username in localStorage for display in dashboard
      localStorage.setItem('system_username', data.username);
      localStorage.setItem('system_role', data.role);

      router.push(data.redirect || '/');
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan sistem.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden' }}>
      {/* Background Image */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/payment_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }}></div>

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
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#064e3b', marginBottom: '0.5rem' }}>Otorisasi Sistem</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Akses khusus untuk <strong style={{color: '#059669'}}>{roleName}</strong></p>
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
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi..."
                style={{ width: '100%', padding: '0.75rem 3rem 0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.25rem'
                }}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
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
