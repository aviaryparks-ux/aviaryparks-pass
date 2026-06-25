"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
// lucide-react import removed because we are using inline SVGs
export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      let storedId = '';
      if (typeof window !== 'undefined') {
        storedId = localStorage.getItem('tempUserId') || '';
        // Jika tidak ada ID (misal dari alur registrasi lama), fallback ke group_id
        if (!storedId) {
          const storedGroupId = localStorage.getItem('tempGroupId');
          if (storedGroupId) {
            const { data } = await supabase
              .from('members')
              .select('id')
              .eq('group_id', storedGroupId)
              .eq('role', 'PRIMARY')
              .limit(1)
              .single();
            if (data) storedId = data.id;
          }
        }
      }

      if (!storedId) {
        setLoading(false);
        return;
      }

      // 1. Tarik Data User
      const { data: memberData, error: memberErr } = await supabase
        .from('members')
        .select('*')
        .eq('id', storedId)
        .limit(1)
        .single();

      if (memberData && !memberErr) {
        if (memberData.status === 'PENDING_PAYMENT') {
          if (typeof window !== 'undefined') {
            localStorage.setItem('tempGroupId', memberData.group_id);
            localStorage.setItem('tempUserName', memberData.name);
            window.location.href = '/payment';
          }
          return;
        }
        
        setUser(memberData);
        
        // 2. Tarik Data Kunjungan User Tersebut
        const { data: visitsData } = await supabase
          .from('visits')
          .select('*')
          .eq('member_id', memberData.id)
          .order('visited_at', { ascending: false });
          
        if (visitsData) {
          setVisits(visitsData);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}><p>Memuat Dashboard...</p></div>;
  }

  if (!user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}><p>Sesi tidak valid. <Link href="/" style={{color: 'var(--primary-color)'}}>Kembali</Link></p></div>;
  }

  const activation = new Date(user.activation_date || new Date());
  const expiration = new Date(activation);
  expiration.setFullYear(expiration.getFullYear() + 1);

  const thisMonthVisits = visits.filter(v => {
    const vDate = new Date(v.visited_at);
    const now = new Date();
    return vDate.getMonth() === now.getMonth() && vDate.getFullYear() === now.getFullYear();
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#334155' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '260px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3rem' }}>
          <img src="/logo.png" alt="Aviary Park Indonesia" style={{ height: '50px', width: 'auto' }} />
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '0.5rem', fontWeight: '600', textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Dashboard
          </a>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', color: '#64748b', textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            Annual Pass Saya
          </a>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', color: '#64748b', textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            Kunjungan Saya
          </a>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', color: '#64748b', textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Anggota Keluarga
          </a>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', color: '#64748b', textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            Riwayat Transaksi
          </a>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', color: '#ef4444', textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Keluar
          </a>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: '2rem 3rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.25rem' }}>Selamat datang kembali, {user.name.split(' ')[0]}!</h1>
            <p style={{ color: '#64748b' }}>Siap untuk petualangan seru di Aviary Park hari ini?</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}></div>
              <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Hai, {user.name.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        {/* TOP WIDGETS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Card: Annual Pass Aktif */}
            <div style={{ 
              background: 'linear-gradient(135deg, #10b981, #059669)', 
              borderRadius: '1rem', 
              padding: '2rem', 
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
              flex: 1
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Annual Pass Aktif</span>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold' }}>{user.status}</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Aviary Park<br/>Annual Pass</h2>
            <div>
              <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>Berlaku hingga</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '600' }}>{expiration.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            {/* Dekorasi Siluet */}
            <svg style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.1, width: '200px', height: '200px' }} viewBox="0 0 24 24" fill="currentColor"><path d="M22 16c-4.64 0-8.94-1.85-12.06-5-3.13-3.12-4.99-7.43-4.99-12.07 0-.55-.45-1-1-1s-1 .45-1 1c0 5.17 2.05 10.05 5.56 13.56s8.39 5.57 13.56 5.57c.55 0 1-.45 1-1s-.45-.93-1.07-.93z"/></svg>
          </div>
          
          <div style={{ marginTop: '-1rem' }}>
             <Link href="/print-card" target="_blank" style={{ display: 'block', width: '100%', padding: '0.75rem', background: 'white', color: '#059669', textAlign: 'center', borderRadius: '0.5rem', fontWeight: 'bold', border: '1px solid #10b981', textDecoration: 'none' }}>
               🖨️ Cetak / Unduh E-Card
             </Link>
          </div>
        </div>

        {/* Card: Ringkasan Kunjungan */}
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Ringkasan Kunjungan</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Kunjungan</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>{visits.length} kali</p>
              </div>
            </div>
            <div style={{ height: '1px', background: '#f1f5f9' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#f8fafc', color: '#64748b', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Kunjungan Bulan Ini</p>
                <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>{thisMonthVisits.length} kali</p>
              </div>
            </div>
          </div>

          {/* Card: Status Biometrik (Pengganti Barcode) */}
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', alignSelf: 'flex-start' }}>Akses Masuk</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', alignSelf: 'flex-start' }}>Tunjukkan wajah Anda di gerbang loket.</p>
            
            <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '1rem', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #86efac', marginBottom: '1rem' }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="M12 19c-2.5 0-4.5-1.5-5-3.5h10c-.5 2-2.5 3.5-5 3.5Z"/></svg>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#22c55e', color: 'white', borderRadius: '50%', padding: '0.25rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
            
            <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#22c55e' }}>Wajah Anda Telah Terekam</p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Anda tidak membutuhkan Barcode.</p>
          </div>

        </div>

        {/* BOTTOM WIDGETS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          
          {/* Kunjungan Terakhir */}
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Kunjungan Terakhir</h3>
              <a href="#" style={{ fontSize: '0.875rem', color: '#059669', fontWeight: '500', textDecoration: 'none' }}>Lihat Semua</a>
            </div>
            
            {visits.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center', padding: '2rem 0' }}>Belum ada riwayat kunjungan.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {visits.slice(0, 3).map((v, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>{new Date(v.visited_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(v.visited_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                    </div>
                    <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '500' }}>Berhasil</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fitur Cepat & Banner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Fitur Cepat</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', background: '#f8fafc', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', color: '#059669' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                  </div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '600' }}>Undang Keluarga</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', background: '#f8fafc', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', color: '#059669' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
                  </div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '600' }}>Lihat Event</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', background: '#f8fafc', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', color: '#059669' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m11.5 15.5 5-5"/><path d="m5 11 4-7"/><path d="m2 2 20 20"/><path d="m14 11 5 5-5 5-5-5-5 5-5-5"/></svg>
                  </div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '600' }}>Promo Menarik</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', background: '#f8fafc', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', color: '#059669' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                  </div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '600' }}>Notifikasi</p>
                </div>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(90deg, #ecfdf5, #d1fae5)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#065f46', marginBottom: '0.25rem' }}>Nikmati pengalaman terbaik di Aviary Park</h3>
                <p style={{ fontSize: '0.875rem', color: '#047857' }}>Jangan lewatkan berbagai aktivitas seru dan edukatif setiap harinya.</p>
              </div>
              <button className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', background: '#059669', border: 'none' }}>Lihat Jadwal</button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
