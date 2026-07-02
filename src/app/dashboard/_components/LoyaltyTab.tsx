import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoyaltyTab({ user }: { user: any }) {
  const [rewards, setRewards] = useState<any[]>([]);
  const [mutations, setMutations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/visitor/loyalty?member_id=${user.id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setRewards(json.data.rewards || []);
            setMutations(json.data.mutations || []);
          }
        }
      } catch (e) {
        console.error('Failed to fetch loyalty data', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user.id]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Points Banner */}
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '1rem', padding: '2rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' }}>
          <div>
            <p style={{ margin: 0, fontSize: '1rem', opacity: 0.9, fontWeight: '500', marginBottom: '0.5rem' }}>{t('total_points') || 'Total Aviary Points'}</p>
            <h3 style={{ margin: 0, fontSize: '3rem', fontWeight: 'bold' }}>{user.points_balance || 0} <span style={{ fontSize: '1.25rem', fontWeight: '500', opacity: 0.8 }}>Poin</span></h3>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '50%', backdropFilter: 'blur(4px)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Rewards Catalog */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5rem' }}>🎁 {t('rewards_catalog') || 'Katalog Promo & Diskon'}</h3>
          
          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>Memuat katalog...</p>
          ) : rewards.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>Belum ada promo yang tersedia saat ini.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {rewards.map((r, i) => (
                <div key={i} style={{ border: '1px solid #cbd5e1', borderRadius: '0.75rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', backgroundColor: (user.points_balance || 0) >= r.points_required ? '#f0fdf4' : 'white', borderColor: (user.points_balance || 0) >= r.points_required ? '#86efac' : '#cbd5e1' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: '#0f172a' }}>{r.name}</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{r.description}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#059669' }}>{r.points_required} Poin</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Mutations History */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5rem' }}>📋 {t('points_history') || 'Riwayat Poin'}</h3>
          
          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>Memuat riwayat...</p>
          ) : mutations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Belum ada riwayat transaksi poin.</p>
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>Kumpulkan poin dengan jajan F&B atau Wahana menggunakan gelang ID Anda!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {mutations.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i !== mutations.length -1 ? '1px solid #e2e8f0' : 'none', paddingBottom: '1rem' }}>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>{m.description || m.mutation_type}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{new Date(m.created_at).toLocaleString('id-ID')}</p>
                  </div>
                  <span style={{ fontWeight: 'bold', fontSize: '1rem', color: m.mutation_type === 'EARN' ? '#10b981' : '#ef4444' }}>
                    {m.mutation_type === 'EARN' ? '+' : '-'}{m.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
