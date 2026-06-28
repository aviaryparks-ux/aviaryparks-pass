import React, { useState } from 'react';
import Link from 'next/link';

export default function AnnualPassTab({
  user,
  expiration,
}: {
  user: any;
  expiration: Date;
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
      <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Header Title */}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>Informasi Annual Pass</h2>
          <p style={{ color: '#64748b' }}>Kelola tiket tahunan dan data biometrik Anda di sini.</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
          
          {/* Left Column: Membership Details & Perks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Membership Card Details (Premium Flippable Card) */}
            <div style={{ perspective: '1000px', width: '100%', aspectRatio: '1.58 / 1', containerType: 'inline-size', minHeight: '250px' }}>
              <div 
                onClick={() => setIsFlipped(!isFlipped)}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  cursor: 'pointer'
                }}
              >
                {/* --- FRONT OF CARD --- */}
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden',
                  background: 'url(\'/hornbill-card-bg.png\') center right / cover no-repeat, #064e3b', 
                  borderRadius: '4cqi', 
                  color: 'white',
                  boxShadow: '0 15px 35px -5px rgba(6, 78, 59, 0.4)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '5cqi',
                }}>
                  {/* Header Card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2cqi' }}>
                      <img src="/logo.png" alt="Aviary Park" style={{ height: '9cqi' }} />
                      <div style={{ height: '6cqi', width: '1px', backgroundColor: 'rgba(255,255,255,0.4)' }}></div>
                      <span style={{ fontSize: '2.5cqi', opacity: 0.9, fontWeight: '500' }}>Annual Pass Aktif</span>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '1cqi 3cqi', borderRadius: '5cqi', fontSize: '2.2cqi', fontWeight: 'bold', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {user.status === 'ACTIVE' || user.status === 'primary' || user.role === 'PRIMARY' ? 'ACTIVE' : (user.status || 'ACTIVE')}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', paddingBottom: '1cqi', maxWidth: '70%' }}>
                    <h3 style={{ margin: 0, fontSize: '6cqi', fontWeight: '800', lineHeight: '1.1', textShadow: '0 2px 4px rgba(0,0,0,0.5)', marginBottom: '3cqi' }}>
                      Aviary Park<br/>Annual Pass
                    </h3>
                    
                    <div style={{ marginBottom: '3cqi' }}>
                      <p style={{ margin: 0, fontSize: '2cqi', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Nama Pengunjung</p>
                      <p style={{ margin: 0, fontSize: '4cqi', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '5cqi' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '2cqi', opacity: 0.8, textTransform: 'uppercase' }}>Berlaku hingga</p>
                        <p style={{ margin: 0, fontSize: '2.8cqi', fontWeight: 'bold', color: '#facc15' }}>
                          {expiration.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '2cqi', opacity: 0.8, textTransform: 'uppercase' }}>NIK</p>
                        <p style={{ margin: 0, fontSize: '2.8cqi', fontWeight: 'bold' }}>{user.nik || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- BACK OF CARD --- */}
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                  background: 'url(\'/hornbill-card-bg.png\') center right / cover no-repeat, #064e3b', 
                  borderRadius: '4cqi', 
                  color: 'white',
                  boxShadow: '0 15px 35px -5px rgba(6, 78, 59, 0.4)',
                  overflow: 'hidden',
                  clipPath: 'inset(0 round 4cqi)',
                  WebkitMaskImage: '-webkit-radial-gradient(white, black)', /* Fix Safari overflow bleeding */
                  isolation: 'isolate', /* Fix stacking context bleeding */
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {/* Top Text */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3cqi 4cqi 1cqi 4cqi', fontSize: '2cqi', opacity: 0.9 }}>
                    <span>Kartu ini adalah milik Aviary Park Indonesia.</span>
                    <span>APID-{user.id?.substring(0, 8) || '250625-0001'}</span>
                  </div>
                  
                  {/* Content columns */}
                  <div style={{ display: 'flex', padding: '1cqi 4cqi 3cqi 4cqi', flex: 1, gap: '2cqi' }}>
                    
                    {/* Left Column: T&C */}
                    <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '2cqi' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1cqi', marginBottom: '1cqi', color: '#86efac' }}>
                        <svg width="2.5cqi" height="2.5cqi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                        <span style={{ fontSize: '2cqi', fontWeight: 'bold' }}>Syarat & Ketentuan</span>
                      </div>
                      <ul style={{ paddingLeft: '2.5cqi', margin: 0, fontSize: '1.4cqi', opacity: 0.9, display: 'flex', flexDirection: 'column', gap: '0.4cqi' }}>
                        <li>Kartu berlaku untuk satu orang dan tidak dapat dipindahtangankan.</li>
                        <li>Wajib ditunjukkan saat memasuki area Aviary Park.</li>
                        <li>Tidak berlaku pada acara khusus / tiket tambahan.</li>
                        <li>Kehilangan kartu bukan tanggung jawab manajemen.</li>
                        <li>Syarat & ketentuan dapat berubah sewaktu-waktu.</li>
                      </ul>
                      
                      {/* Real Barcode API */}
                      <div style={{ marginTop: 'auto', background: 'white', padding: '1cqi', borderRadius: '1cqi', display: 'flex', justifyContent: 'center' }}>
                        <img 
                          src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${user.nik || user.id?.substring(0, 8) || '250625-0001'}&scale=2&height=10&includetext`} 
                          alt="Barcode" 
                          style={{ width: '100%', height: '7cqi', objectFit: 'contain' }}
                        />
                      </div>
                    </div>

                    {/* Right Column: Contact without Logo */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: '1.5cqi', position: 'relative', zIndex: 1, textAlign: 'right' }}>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1cqi', fontSize: '1.8cqi', opacity: 0.9, width: '100%' }}>
                        <span>www.aviarypark.com</span>
                        <svg width="2.5cqi" height="2.5cqi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1cqi', fontSize: '1.8cqi', opacity: 0.9, width: '100%' }}>
                        <span>@aviaryparkindonesia</span>
                        <svg width="2.5cqi" height="2.5cqi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: '1cqi', fontSize: '1.8cqi', opacity: 0.9, width: '100%' }}>
                        <span>Jl. Bintaro Creative District No.15, Pd. Ranji,<br/>Kec. Ciputat Tim., Kota Tangerang Selatan,<br/>Banten 15224</span>
                        <svg width="2.5cqi" height="2.5cqi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginTop: '0.1rem' }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href="/print-card" target="_blank" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flex: 1, padding: '0.75rem', background: '#0f172a', color: 'white', borderRadius: '0.5rem', fontWeight: 'bold', textDecoration: 'none', transition: 'background 0.2s' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                Cetak / Unduh E-Card
              </Link>
              <button 
                onClick={() => alert('Masa aktif Anda masih berlaku cukup lama! Fitur pembayaran perpanjangan akan otomatis terbuka 30 hari sebelum kartu kedaluwarsa.')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flex: 1, padding: '0.75rem', background: 'white', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
              >
                Perpanjang Masa Aktif
              </button>
            </div>

            {/* Member Perks */}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>Keuntungan Member Anda</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ padding: '0.25rem', background: '#fef3c7', color: '#d97706', borderRadius: '50%' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#334155' }}>Akses masuk tanpa batas ke semua area Aviary Park selama 1 tahun penuh.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ padding: '0.25rem', background: '#fef3c7', color: '#d97706', borderRadius: '50%' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#334155' }}>Diskon eksklusif 15% di seluruh restoran dan kafe di dalam area taman.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ padding: '0.25rem', background: '#fef3c7', color: '#d97706', borderRadius: '50%' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#334155' }}>Prioritas tempat duduk pada pertunjukan satwa utama.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Biometrics */}
          <div style={{ display: 'flex', flexDirection: 'column', background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem', alignItems: 'center', textAlign: 'center', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>Status Biometrik Wajah</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>Gunakan wajah Anda sebagai kunci masuk di gerbang Aviary Park. Cepat dan tanpa repot.</p>
            
            <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #22c55e', boxShadow: '0 4px 14px 0 rgba(34, 197, 94, 0.2)', marginBottom: '1.5rem' }}>
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="M12 19c-2.5 0-4.5-1.5-5-3.5h10c-.5 2-2.5 3.5-5 3.5Z"/></svg>
              <div style={{ position: 'absolute', bottom: '0', right: '0', background: '#22c55e', color: 'white', borderRadius: '50%', padding: '0.25rem', border: '2px solid white' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>

            <p style={{ fontSize: '1rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '0.25rem' }}>Data Wajah Terverifikasi</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1.5rem' }}>Terakhir diperbarui: {new Date(user.activation_date || new Date()).toLocaleDateString('id-ID')}</p>
            
            <button style={{ width: '100%', padding: '0.75rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontWeight: '600', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'background 0.2s' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Perbarui Foto Wajah
            </button>
            <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.75rem', textAlign: 'center' }}>Pemotretan ulang hanya dapat dilakukan maksimal 1 kali dalam 3 bulan untuk keamanan data.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
