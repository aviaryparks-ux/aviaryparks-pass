import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SchedulesTab() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  async function fetchSchedules() {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('start_time', { ascending: true });
        
      if (!error && data) {
        setSchedules(data);
      }
    } catch (e) {
      console.error('Error fetching schedules:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .schedule-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
      `}} />
      
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>Jadwal Aktivitas Harian</h2>
          <p style={{ color: '#64748b' }}>Jangan lewatkan berbagai aktivitas seru dan edukatif setiap harinya di Aviary Park.</p>
        </div>
        <div style={{ padding: '0.5rem 1rem', background: '#ecfdf5', color: '#059669', borderRadius: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          HARI INI
        </div>
      </div>

      {selectedSchedule ? (
        <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden', animation: 'fadeIn 0.3s ease-out' }}>
          {selectedSchedule.image_url && (
            <div style={{ width: '100%', position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', backgroundColor: '#0f172a' }}>
              <div style={{ position: 'absolute', top: -30, left: -30, right: -30, bottom: -30, backgroundImage: `url('${selectedSchedule.image_url}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px) brightness(0.4)', zIndex: 0 }} />
              <img src={selectedSchedule.image_url} alt={selectedSchedule.title} style={{ width: '100%', maxWidth: '1000px', height: 'auto', display: 'block', position: 'relative', zIndex: 1, boxShadow: '0 0 40px rgba(0,0,0,0.6)', objectFit: 'contain' }} />
            </div>
          )}
          
          <div style={{ padding: '2rem' }}>
            <button 
              onClick={() => setSelectedSchedule(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: '#059669', fontWeight: 'bold', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
              Kembali ke Daftar Jadwal
            </button>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fffbeb', color: '#b45309', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {selectedSchedule.start_time} - {selectedSchedule.end_time} WIB
            </div>

            <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#064e3b', marginBottom: '1rem', lineHeight: '1.2' }}>
              {selectedSchedule.title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid #e2e8f0' }}>
              {selectedSchedule.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '1.1rem', fontWeight: '500' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  {selectedSchedule.location}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '1.1rem', fontWeight: '500' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M11 7h2v6h-2zm0 8h2v2h-2z"/></svg>
                Aktivitas Spesial
              </div>
            </div>

            <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#334155', whiteSpace: 'pre-wrap' }}>
              {selectedSchedule.description}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '3rem', paddingTop: '2.5rem', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '0.75rem 1.5rem', borderRadius: '1rem', color: '#064e3b', fontWeight: '600' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Semua Usia
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '0.75rem 1.5rem', borderRadius: '1rem', color: '#064e3b', fontWeight: '600' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ± 15 Menit
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '0.75rem 1.5rem', borderRadius: '1rem', color: '#064e3b', fontWeight: '600' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                Edukasi
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '0.75rem 1.5rem', borderRadius: '1rem', color: '#064e3b', fontWeight: '600' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="14" x="3" y="5" rx="2" ry="2"/><path d="M8 5V3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><circle cx="12" cy="12" r="3"/></svg>
                Photo Spot
              </div>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', height: '180px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', backgroundColor: '#f1f5f9' }}></div>
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
          <div style={{ width: '64px', height: '64px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#94a3b8' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>Belum Ada Jadwal Aktivitas</h3>
          <p style={{ color: '#64748b' }}>Jadwal aktivitas taman hari ini belum tersedia.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {schedules.map(schedule => (
            <div key={schedule.id} className="schedule-card" style={{ background: 'white', borderRadius: '1rem', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', transition: 'all 0.3s' }}>
              
              {/* Gambar (Atas) */}
              <div style={{ width: '100%', position: 'relative', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {schedule.image_url ? (
                  <img src={schedule.image_url} alt={schedule.title} style={{ width: '100%', height: '200px', display: 'block', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
                )}
              </div>
              
              {/* Konten (Bawah) */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                
                {/* Waktu */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fffbeb', color: '#b45309', padding: '0.3rem 0.75rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', width: 'fit-content' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {schedule.start_time} - {schedule.end_time} WIB
                </div>
                
                {/* Judul */}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#064e3b', marginBottom: '0.5rem', lineHeight: '1.2' }}>
                  {schedule.title}
                </h3>
                
                {/* Lokasi */}
                {schedule.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', fontWeight: '500', marginBottom: '1rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    {schedule.location}
                  </div>
                )}
                
                {/* Deskripsi */}
                {schedule.description && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '1.5rem' }}>
                      {schedule.description}
                    </p>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: 'auto' }}>
                  <button 
                    onClick={() => setSelectedSchedule(schedule)}
                    style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', color: '#059669', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; e.currentTarget.style.borderColor = '#86efac'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  >
                    Baca Selengkapnya
                  </button>
                </div>

                {/* Footer Icons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: 'auto', color: '#064e3b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="14" x="3" y="5" rx="2" ry="2"/><path d="M8 5V3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><circle cx="12" cy="12" r="3"/></svg>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
