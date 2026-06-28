import React from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DashboardTab({
  user,
  visits,
  thisMonthVisits,
  isFlipped,
  setIsFlipped,
  expiration,
  setCurrentTab,
  familyMembers = [],
}: {
  user: any;
  visits: any[];
  thisMonthVisits: any[];
  isFlipped: boolean;
  setIsFlipped: (val: boolean) => void;
  expiration: Date;
  setCurrentTab?: (tab: string) => void;
  familyMembers?: any[];
}) {
  // Hapus primary user dari list familyMembers (jika terduplikasi)
  const filteredFamily = (familyMembers || []).filter(m => m.id !== user.id);
  const allCards = [user, ...filteredFamily];
  const [activeCardIndex, setActiveCardIndex] = React.useState(0);
  const activeUser = allCards[activeCardIndex] || user;
  const { t } = useLanguage();

  // Calculate Family Visits (unique days)
  const uniqueVisitDays = new Set(visits.map(v => new Date(v.visited_at).toISOString().split('T')[0]));
  const totalFamilyVisits = uniqueVisitDays.size;

  const thisMonthVisitDays = new Set(thisMonthVisits.map(v => new Date(v.visited_at).toISOString().split('T')[0]));
  const totalThisMonthFamilyVisits = thisMonthVisitDays.size;
  
  // Get unique visits for recent list (only one per day)
  const recentVisits: any[] = [];
  const seenDates = new Set();
  visits.forEach(v => {
    const d = new Date(v.visited_at).toISOString().split('T')[0];
    if (!seenDates.has(d)) {
      seenDates.add(d);
      recentVisits.push(v);
    }
  });

  return (
    <>
      <style>{`
        @keyframes pulseScan {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes popCheck {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); box-shadow: 0 0 10px rgba(34,197,94,0.5); }
          100% { transform: scale(1); }
        }
        @keyframes scanLine {
          0% { transform: translateY(-25px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(25px); opacity: 0; }
        }
        @keyframes pulseButton {
          0% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.4); border-color: rgba(5, 150, 105, 0.8); }
          70% { box-shadow: 0 0 0 10px rgba(5, 150, 105, 0); border-color: #e2e8f0; }
          100% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0); border-color: #e2e8f0; }
        }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Card Carousel Controls */}
          {allCards.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem', marginBottom: '-0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#334155' }}>
                ID Card: {activeCardIndex === 0 ? t('id_card_primary') : t('id_card_family')}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {allCards.map((member, i) => (
                  <button 
                    key={i}
                    onClick={() => { setActiveCardIndex(i); setIsFlipped(false); }}
                    style={{ 
                      padding: '0.25rem 0.75rem',
                      borderRadius: '1rem', 
                      background: i === activeCardIndex ? '#059669' : '#e2e8f0',
                      color: i === activeCardIndex ? 'white' : '#64748b',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                  >
                    {member.name ? member.name.split(' ')[0] : 'Member'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card: Annual Pass Aktif (Flippable) */}
          <div className="notranslate" translate="no" style={{ perspective: '1000px', width: '100%', aspectRatio: '1.58 / 1', containerType: 'inline-size', minHeight: '200px' }}>
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
                    {activeUser.status === 'ACTIVE' || activeUser.status === 'primary' || activeUser.role === 'PRIMARY' ? 'ACTIVE' : (activeUser.status || 'ACTIVE')}
                  </div>
                </div>

                {/* Main Content */}
                <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', paddingBottom: '1cqi', maxWidth: '70%' }}>
                  <h3 style={{ margin: 0, fontSize: '6cqi', fontWeight: '800', lineHeight: '1.1', textShadow: '0 2px 4px rgba(0,0,0,0.5)', marginBottom: '3cqi' }}>
                    Aviary Park<br/>Annual Pass
                  </h3>
                  
                  <div style={{ marginBottom: '3cqi' }}>
                    <p style={{ margin: 0, fontSize: '2cqi', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Nama</p>
                    <p className="notranslate" translate="no" style={{ margin: 0, fontSize: '4cqi', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeUser.name}</p>
                  </div>

                  <div style={{ display: 'flex', gap: '5cqi' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '2cqi', opacity: 0.8, textTransform: 'uppercase' }}>Berlaku hingga</p>
                      <p style={{ margin: 0, fontSize: '2.8cqi', fontWeight: 'bold', color: '#facc15' }}>
                        {expiration.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '2cqi', opacity: 0.8, textTransform: 'uppercase' }}>NIK / ID</p>
                      <p style={{ margin: 0, fontSize: '2.8cqi', fontWeight: 'bold' }}>{activeUser.nik || activeUser.id.substring(0,8).toUpperCase()}</p>
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
                  <span>APID-{activeUser.id?.substring(0, 8) || '250625-0001'}</span>
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
                        src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${activeUser.nik || activeUser.id?.substring(0, 8) || '250625-0001'}&scale=2&height=10&includetext`} 
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
          {/* END OF ID CARD */}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
            <Link href={`/print-card?id=${activeUser.id}`} target="_blank" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flex: 1, padding: '1rem', background: '#0f172a', color: 'white', borderRadius: '0.75rem', fontWeight: 'bold', textDecoration: 'none', transition: 'background 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
              {t('print_download') || 'Cetak / Unduh'}
            </Link>
            <button 
              onClick={() => toast.success(t('extension_info') || 'Masa aktif Anda masih berlaku cukup lama!', { duration: 5000 })}
              style={{ flex: 1, padding: '1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontWeight: 'bold', color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s', animation: 'pulseButton 2s infinite' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
              {t('extend') || 'Perpanjang'}
            </button>
          </div>

          {/* Kunjungan Terakhir */}
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{t('recent_activity') || 'Kunjungan Terakhir'}</h3>
              <span onClick={() => setCurrentTab && setCurrentTab('visits')} style={{ fontSize: '0.875rem', color: '#059669', fontWeight: '500', textDecoration: 'none', cursor: 'pointer' }}>Lihat Semua</span>
            </div>
            
            {visits.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center', padding: '2rem 0' }}>{t('no_activity') || 'Belum ada riwayat kunjungan.'}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentVisits.slice(0, 3).map((v, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>{new Date(v.visited_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(v.visited_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                    </div>
                    <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '500' }}>{t('enter_park') || 'Berhasil Masuk'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* END OF LEFT COLUMN */}

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card: Ringkasan Kunjungan Anggota */}
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>{t('total_visits') || 'Ringkasan Kunjungan Anggota'}</h3>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Keluarga: <strong>{totalFamilyVisits} Hari</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Bulan Ini: <strong>{totalThisMonthFamilyVisits} Hari</strong></span>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', flex: 1, alignContent: 'start' }}>
              {familyMembers && familyMembers.map((member, idx) => {
                const memberVisits = visits.filter(v => v.member_id === member.id).length;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #f1f5f9', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#475569', fontSize: '1.25rem', flexShrink: 0, overflow: 'hidden' }}>
                      {member.photo_url ? (
                        <img src={member.photo_url} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="notranslate" translate="no" style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name.split(' ')[0]}</p>
                      <p style={{ color: '#16a34a', fontSize: '0.875rem', fontWeight: 'bold', marginTop: '0.125rem' }}>{memberVisits} {t('visits_count') || 'Kali Masuk'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Fitur Cepat & Banner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>{t('quick_features') || 'Fitur Cepat'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div 
                  onClick={() => {
                    const shareData = {
                      title: 'Aviary Park Annual Pass',
                      text: 'Yuk, liburan bareng ke Aviary Park!',
                      url: window.location.origin,
                    };
                    if (navigator.share) {
                      navigator.share(shareData).catch(console.error);
                    } else {
                      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                      toast.success(t('copied_to_clipboard') || 'Teks undangan telah disalin ke clipboard!');
                    }
                  }}
                  style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ width: '48px', height: '48px', background: '#f8fafc', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', color: '#059669' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                  </div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '600' }}>{t('invite_family') || 'Undang Keluarga'}</p>
                </div>
                <div 
                  onClick={() => setCurrentTab && setCurrentTab('events')}
                  style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ width: '48px', height: '48px', background: '#f8fafc', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', color: '#059669' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
                  </div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '600' }}>{t('view_events') || 'Lihat Event'}</p>
                </div>
                <div 
                  onClick={() => toast(t('promo_coming_soon') || 'Nantikan "Promo Menarik" eksklusif untuk member Annual Pass di update selanjutnya!', { icon: '🎁' })}
                  style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ width: '48px', height: '48px', background: '#f8fafc', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', color: '#059669' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m11.5 15.5 5-5"/><path d="m5 11 4-7"/><path d="m2 2 20 20"/><path d="m14 11 5 5-5 5-5-5-5 5-5-5"/></svg>
                  </div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '600' }}>{t('special_promos') || 'Promo Menarik'}</p>
                </div>
                <div 
                  onClick={() => toast(t('no_new_notifications') || 'Belum ada notifikasi baru untuk Anda hari ini.', { icon: '🔔' })}
                  style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ width: '48px', height: '48px', background: '#f8fafc', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', color: '#059669' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                  </div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '600' }}>{t('notifications') || 'Notifikasi'}</p>
                </div>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(90deg, #ecfdf5, #d1fae5)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#065f46', marginBottom: '0.25rem' }}>{t('enjoy_best_experience') || 'Nikmati pengalaman terbaik di Aviary Park'}</h3>
                <p style={{ fontSize: '0.875rem', color: '#047857' }}>{t('dont_miss_activities') || 'Jangan lewatkan berbagai aktivitas seru dan edukatif setiap harinya.'}</p>
              </div>
              <button 
                onClick={() => setCurrentTab && setCurrentTab('schedules')}
                style={{ padding: '0.75rem 1.5rem', background: '#059669', border: 'none', color: 'white', borderRadius: '0.5rem', cursor: 'pointer', transition: 'background 0.2s', fontWeight: 'bold' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#047857'}
                onMouseOut={(e) => e.currentTarget.style.background = '#059669'}
              >
                {t('view_schedule') || 'Lihat Jadwal'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* END MAIN GRID */}
    </>
  );
}
