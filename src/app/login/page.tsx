"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Step = 'email' | 'otp';

export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }, [step]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/visitor-login/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Gagal mengirim kode. Coba lagi.'); return; }
      setStep('otp');
      setCountdown(60);
    } catch { setErrorMsg('Terjadi kesalahan koneksi.'); }
    finally { setIsLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length < 6) { setErrorMsg('Masukkan 6 digit kode OTP.'); return; }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/visitor-login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Kode salah atau sudah kadaluarsa.');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
        return;
      }
      router.push(data.redirect || '/dashboard');
    } catch { setErrorMsg('Terjadi kesalahan koneksi.'); }
    finally { setIsLoading(false); }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setErrorMsg('');
    setOtp(['', '', '', '', '', '']);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/visitor-login/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Gagal mengirim ulang kode.'); return; }
      setCountdown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch { setErrorMsg('Terjadi kesalahan koneksi.'); }
    finally { setIsLoading(false); }
  };

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }, [otp]);

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => { if (i < 6) newOtp[i] = char; });
    setOtp(newOtp);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const maskedEmail = email
    ? email.replace(/^(.{1})(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.min(b.length, 4))}${c}`)
    : '';

  const isOtpFilled = otp.every((d) => d !== '');

  return (
    <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/payment_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />

      <div className="logo-container" style={{ position: 'absolute', top: 0, left: '3rem', padding: '1rem 2rem 1.5rem 2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f0fdf4', transform: 'perspective(150px) rotateX(-10deg)', transformOrigin: 'top', borderBottomLeftRadius: '1.5rem', borderBottomRightRadius: '1.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: -1 }} />
        <img className="logo-img" src="/logo.png" alt="Aviary Park Logo" style={{ height: '70px', objectFit: 'contain' }} />
      </div>

      <style>{`
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .step-card { animation: fadeSlideIn 0.3s ease; }
        @keyframes shimmer-btn { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
        .primary-btn { background: linear-gradient(90deg, #059669, #34d399, #059669); background-size:200% auto; animation:shimmer-btn 3s linear infinite; transition:transform 0.2s,box-shadow 0.2s; }
        .primary-btn:hover:not(:disabled) { transform:scale(1.02); box-shadow:0 8px 30px rgba(5,150,105,0.5); }
        .otp-box:focus { border-color:#059669 !important; box-shadow:0 0 0 3px rgba(5,150,105,0.2); outline:none; }
      `}</style>

      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
        <div className="mobile-px-4 mobile-py-4" style={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', maxWidth: '420px', width: '100%', padding: '2.5rem 2rem' }}>

          {step === 'email' && (
            <div className="step-card">
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg,#064e3b,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem' }}>✉️</div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#064e3b', margin: '0 0 0.4rem' }}>Masuk ke Dashboard</h2>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Kami akan mengirim kode verifikasi ke email terdaftar Anda.</p>
              </div>
              {errorMsg && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.875rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.85rem', border: '1px solid #fecaca', display: 'flex', gap: '0.5rem' }}><span>⚠️</span><span>{errorMsg}</span></div>}
              <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155', fontSize: '0.875rem' }}>Alamat Email</label>
                  <input type="email" required placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    onFocus={(e) => (e.target.style.borderColor = '#059669')} onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')} />
                </div>
                <button type="submit" disabled={isLoading} className={!isLoading ? 'primary-btn' : ''}
                  style={{ padding: '1rem', fontSize: '1rem', fontWeight: '700', color: 'white', backgroundColor: isLoading ? '#94a3b8' : '#059669', border: 'none', borderRadius: '32px', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                  {isLoading ? 'Mengirim kode...' : 'Kirim Kode Verifikasi →'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                Belum punya tiket?{' '}<Link href="/register" style={{ color: '#059669', fontWeight: '700', textDecoration: 'none' }}>Beli Annual Pass</Link>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <div className="step-card">
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg,#064e3b,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem' }}>🔐</div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#064e3b', margin: '0 0 0.4rem' }}>Cek Email Anda</h2>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Kode 6 digit dikirim ke<br /><strong style={{ color: '#334155' }}>{maskedEmail}</strong></p>
              </div>
              {errorMsg && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.875rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.85rem', border: '1px solid #fecaca', display: 'flex', gap: '0.5rem' }}><span>⚠️</span><span>{errorMsg}</span></div>}
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={(el) => { otpRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit} className="otp-box"
                      onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} onPaste={i === 0 ? handleOtpPaste : undefined}
                      style={{ width: '48px', height: '56px', textAlign: 'center', fontSize: '1.5rem', fontWeight: '700', border: `2px solid ${digit ? '#059669' : '#cbd5e1'}`, borderRadius: '10px', backgroundColor: digit ? '#f0fdf4' : 'white', color: '#064e3b', transition: 'all 0.15s' }} />
                  ))}
                </div>
                <button type="submit" disabled={isLoading || !isOtpFilled} className={(!isLoading && isOtpFilled) ? 'primary-btn' : ''}
                  style={{ padding: '1rem', fontSize: '1rem', fontWeight: '700', color: 'white', backgroundColor: (isLoading || !isOtpFilled) ? '#94a3b8' : '#059669', border: 'none', borderRadius: '32px', cursor: (isLoading || !isOtpFilled) ? 'not-allowed' : 'pointer' }}>
                  {isLoading ? 'Memverifikasi...' : 'Verifikasi & Masuk →'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button onClick={handleResend} disabled={countdown > 0 || isLoading}
                  style={{ background: 'none', border: 'none', color: countdown > 0 ? '#94a3b8' : '#059669', fontWeight: '600', fontSize: '0.875rem', cursor: countdown > 0 ? 'default' : 'pointer', padding: 0 }}>
                  {countdown > 0 ? `Kirim ulang kode (${countdown}s)` : 'Kirim ulang kode'}
                </button>
                <button onClick={() => { setStep('email'); setErrorMsg(''); setOtp(['','','','','','']); }}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>
                  ← Ubah email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
