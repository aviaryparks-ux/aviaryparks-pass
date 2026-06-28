import Link from 'next/link';
import { Leaf, Bird, Feather } from 'lucide-react';
import LanguageSelector from './_components/LanguageSelector';

export default function Home() {
  return (
    <div style={{ height: '100dvh', position: 'relative', overflow: 'hidden', backgroundColor: '#f0fdf4', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      
      {/* Background Image with Gradient Mask */}
      <div className="mobile-bg-hero" style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 0,
        background: `linear-gradient(to right, rgba(240,253,244,1) 0%, rgba(240,253,244,1) 40%, rgba(240,253,244,0.4) 60%, rgba(255,255,255,0) 100%), url('/hero-new.jpg') right center / cover no-repeat`,
        opacity: 0.9,
      }}></div>

      {/* Authentic Aviary Park Brand Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: '55%',
        zIndex: 0,
        background: `url('/aviary_pattern.png') left top / cover`,
        opacity: 0.1,
        pointerEvents: 'none',
        maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
        WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)'
      }}></div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        
        {/* HEADER */}
        <header className="header-container" style={{ padding: '1rem 3rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative', zIndex: 10, gap: '1rem' }}>
          
          <LanguageSelector />
          
          {/* Hanging Left Logo Tab */}
          <div className="logo-container" style={{ 
            position: 'absolute', 
            left: '5rem', 
            top: 0, 
            padding: '1rem 2rem 1.5rem 2rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10
          }}>
            {/* 3D Trapezoid Background */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#f0fdf4',
              transform: 'perspective(150px) rotateX(-10deg)',
              transformOrigin: 'top',
              borderBottomLeftRadius: '1.5rem',
              borderBottomRightRadius: '1.5rem',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              zIndex: -1
            }}></div>
            <img className="logo-img" src="/logo.png" alt="Aviary Park Indonesia" style={{ height: '70px', width: 'auto' }} />
          </div>
        </header>

        {/* HERO SECTION */}
        <main className="mobile-px-4 mobile-pt-20" style={{ flex: 1, padding: '0.5rem 3rem 1rem 3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          
          <div className="mobile-col mobile-text-center" style={{ maxWidth: '600px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '0' }}>
            {/* Badge removed as per request */}
            
            {/* Headline */}
            <h1 className="mobile-h1" style={{ fontSize: '3rem', fontWeight: '800', lineHeight: 1.1, color: '#14532d', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
              Satu Tiket.<br/>
              Petualangan <span style={{ color: '#16a34a' }}>Sepanjang</span><br/>
              <span style={{ color: '#16a34a', position: 'relative' }}>
                Tahun.
                <svg style={{ position: 'absolute', bottom: '-8px', left: 0, width: '100%', height: '10px' }} viewBox="0 0 200 12" fill="none" preserveAspectRatio="none"><path d="M2 9.5C50 3.5 100 2 198 9.5" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round"/></svg>
              </span>
            </h1>
            
            {/* Subtext */}
            <p className="mobile-p" style={{ fontSize: '0.95rem', color: '#334155', marginBottom: '1rem', lineHeight: 1.5, maxWidth: '450px' }}>
              Dapatkan akses tak terbatas ke Aviary Park Indonesia.<br/>
              Tanpa kartu fisik, tanpa antrean panjang.<br/>
              Wajah Anda adalah <span style={{ color: '#16a34a', fontWeight: 'bold' }}>kunci masuk Anda.</span>
            </p>
            
            {/* CTA Buttons */}
            <div className="header-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <Link href="/register" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', backgroundColor: '#059669', color: 'white', fontSize: '0.9rem', fontWeight: 'bold', borderRadius: '3rem', textDecoration: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                Daftar Annual Pass
              </Link>
              <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', backgroundColor: 'white', color: '#0f172a', fontSize: '0.9rem', fontWeight: 'bold', borderRadius: '3rem', textDecoration: 'none', border: '1px solid #e2e8f0' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
                Masuk ke Dasbor
              </Link>
            </div>

            {/* Trust Badges Bar */}
            <div className="trust-badges" style={{ 
              backgroundColor: 'white', 
              borderRadius: '0.75rem', 
              padding: '0.75rem 1rem', 
              display: 'inline-flex', 
              gap: '1.5rem', 
              border: '1px solid #f1f5f9',
              alignSelf: 'flex-start'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ color: '#059669' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg></div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.8rem', color: '#0f172a' }}>Sistem Cloud Aman</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Data terlindungi</div>
                </div>
              </div>
              <div className="trust-badge-divider" style={{ width: '1px', backgroundColor: '#e2e8f0' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ color: '#059669' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="M12 19c-2.5 0-4.5-1.5-5-3.5h10c-.5 2-2.5 3.5-5 3.5Z"/></svg></div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.8rem', color: '#0f172a' }}>Biometrik Wajah</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Masuk tanpa sentuh</div>
                </div>
              </div>
              <div className="trust-badge-divider" style={{ width: '1px', backgroundColor: '#e2e8f0' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ color: '#059669' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.8rem', color: '#0f172a' }}>Tiket Keluarga</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Lebih hemat</div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM FEATURE CARDS */}
          <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', paddingBottom: '0.5rem', paddingTop: '0.5rem' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #f1f5f9' }}>
              <div style={{ background: '#f0fdf4', padding: '0.5rem', borderRadius: '0.5rem', color: '#059669' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M16 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#059669' }}>Bebas Berkunjung</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Akses tak terbatas setahun</div>
              </div>
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #f1f5f9' }}>
              <div style={{ background: '#f0fdf4', padding: '0.5rem', borderRadius: '0.5rem', color: '#059669' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="M12 19c-2.5 0-4.5-1.5-5-3.5h10c-.5 2-2.5 3.5-5 3.5Z"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#059669' }}>Face Recognition</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Masuk praktis dengan wajah</div>
              </div>
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #f1f5f9' }}>
              <div style={{ background: '#f0fdf4', padding: '0.5rem', borderRadius: '0.5rem', color: '#059669' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#059669' }}>Hemat 40%</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Bandingkan tiket reguler</div>
              </div>
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #f1f5f9' }}>
              <div style={{ background: '#f0fdf4', padding: '0.5rem', borderRadius: '0.5rem', color: '#059669' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#059669' }}>Untuk Keluarga</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Nikmati kebersamaan bersama</div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
