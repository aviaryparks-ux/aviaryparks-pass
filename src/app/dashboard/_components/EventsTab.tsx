import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function EventsTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('event_date', { ascending: false });
        
      if (!error && data) {
        setEvents(data);
      }
    } catch (e) {
      console.error('Error fetching events:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .event-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
      `}} />
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>Berita & Acara Mendatang</h2>
        <p style={{ color: '#64748b' }}>Temukan berbagai event seru dan pengumuman terbaru eksklusif untuk member Annual Pass.</p>
      </div>

      {selectedEvent ? (
        <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden', animation: 'fadeIn 0.3s ease-out' }}>
          {selectedEvent.image_url && (
            <div style={{ width: '100%', position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', backgroundColor: '#0f172a' }}>
              <div style={{ position: 'absolute', top: -30, left: -30, right: -30, bottom: -30, backgroundImage: `url('${selectedEvent.image_url}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px) brightness(0.4)', zIndex: 0 }} />
              <img src={selectedEvent.image_url} alt={selectedEvent.title} style={{ width: '100%', maxWidth: '1000px', height: 'auto', display: 'block', position: 'relative', zIndex: 1, boxShadow: '0 0 40px rgba(0,0,0,0.6)' }} />
            </div>
          )}
          
          <div style={{ padding: '2rem' }}>
            <button 
              onClick={() => setSelectedEvent(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: '#059669', fontWeight: 'bold', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
              Kembali ke Daftar Event
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <span style={{ padding: '0.5rem 1rem', background: '#ecfdf5', color: '#059669', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 'bold' }}>
                {new Date(selectedEvent.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                {new Date(selectedEvent.event_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5rem', lineHeight: '1.2' }}>
              {selectedEvent.title}
            </h1>

            <div style={{ color: '#334155', lineHeight: '1.8', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
              {selectedEvent.content}
            </div>
          </div>
        </div>
      ) : loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', height: '350px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', backgroundColor: '#f1f5f9' }}></div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
          <div style={{ width: '64px', height: '64px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#94a3b8' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>Belum Ada Acara Mendatang</h3>
          <p style={{ color: '#64748b' }}>Saat ini belum ada event atau pengumuman baru. Nantikan kejutan seru dari kami segera!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {events.map(event => (
            <div key={event.id} className="event-card" style={{ background: 'white', borderRadius: '1rem', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', transition: 'all 0.3s' }}>
              
              <div style={{ position: 'relative', height: '180px' }}>
                {event.image_url ? (
                  <img src={event.image_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                )}
                
                {/* Date Badge Overlay */}
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)', padding: '0.5rem', borderRadius: '0.75rem', textAlign: 'center', minWidth: '60px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444', textTransform: 'uppercase' }}>
                    {new Date(event.event_date).toLocaleDateString('id-ID', { month: 'short' })}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', lineHeight: '1' }}>
                    {new Date(event.event_date).toLocaleDateString('id-ID', { day: 'numeric' })}
                  </div>
                </div>
              </div>

              <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.75rem', color: '#0f172a', lineHeight: '1.4' }}>
                  {event.title}
                </h3>
                
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.6' }}>
                  {event.description}
                </p>
                
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: 'auto' }}>
                  <button 
                    onClick={() => setSelectedEvent(event)}
                    style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', color: '#059669', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; e.currentTarget.style.borderColor = '#86efac'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  >
                    Baca Selengkapnya
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
