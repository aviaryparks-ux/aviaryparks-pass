import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

export default function LoyaltyTab({ user }: { user: any }) {
  const [rewards, setRewards] = useState<any[]>([]);
  const [mutations, setMutations] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointsBalance, setPointsBalance] = useState(user.points_balance || 0);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [activeVoucher, setActiveVoucher] = useState<any | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'vouchers' | 'history'>('catalog');
  const { t } = useLanguage();

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/visitor/loyalty?member_id=${user.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setRewards(json.data.rewards || []);
          setMutations(json.data.mutations || []);
          setVouchers(json.data.vouchers || []);
        }
      }
    } catch (e) {
      console.error('Failed to fetch loyalty data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const redeemReward = async (rewardId: string) => {
    if (!confirm('Tukar poin Anda dengan reward ini?')) return;
    
    setRedeemingId(rewardId);
    try {
      const res = await fetch('/api/visitor/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: user.id, reward_id: rewardId })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success('Berhasil menukar poin! Cek Kupon Saya.');
        // Refetch to get new balance and vouchers
        await fetchData();
        // Update local balance
        const reward = rewards.find(r => r.id === rewardId);
        if (reward) {
          setPointsBalance((prev: number) => prev - reward.points_required);
        }
        // Switch to vouchers tab
        setActiveSubTab('vouchers');
      } else {
        toast.error(data.error || 'Gagal menukar poin');
      }
    } catch (e) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', paddingBottom: '3rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Points Banner */}
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '1rem', padding: '2rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' }}>
          <div>
            <p style={{ margin: 0, fontSize: '1rem', opacity: 0.9, fontWeight: '500', marginBottom: '0.5rem' }}>{t('total_points') || 'Total Aviary Points'}</p>
            <h3 style={{ margin: 0, fontSize: '3rem', fontWeight: 'bold' }}>{pointsBalance} <span style={{ fontSize: '1.25rem', fontWeight: '500', opacity: 0.8 }}>Poin</span></h3>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '50%', backdropFilter: 'blur(4px)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
        </div>
      </div>

      {/* Sub-tabs for Loyalty Section */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveSubTab('catalog')} 
          style={{ padding: '0.5rem 1rem', background: activeSubTab === 'catalog' ? '#e0f2fe' : 'transparent', color: activeSubTab === 'catalog' ? '#0284c7' : '#64748b', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          Katalog Reward
        </button>
        <button 
          onClick={() => setActiveSubTab('vouchers')} 
          style={{ padding: '0.5rem 1rem', background: activeSubTab === 'vouchers' ? '#e0f2fe' : 'transparent', color: activeSubTab === 'vouchers' ? '#0284c7' : '#64748b', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          Kupon Saya {vouchers.filter(v => v.status === 'ACTIVE').length > 0 && <span style={{ background: '#ef4444', color: 'white', borderRadius: '9999px', padding: '0.1rem 0.4rem', fontSize: '0.7rem', marginLeft: '0.25rem' }}>{vouchers.filter(v => v.status === 'ACTIVE').length}</span>}
        </button>
        <button 
          onClick={() => setActiveSubTab('history')} 
          style={{ padding: '0.5rem 1rem', background: activeSubTab === 'history' ? '#e0f2fe' : 'transparent', color: activeSubTab === 'history' ? '#0284c7' : '#64748b', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          Riwayat Poin
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', border: '1px solid #e2e8f0', minHeight: '300px' }}>
        
        {/* --- CATALOG SUBTAB --- */}
        {activeSubTab === 'catalog' && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5rem' }}>🎁 {t('rewards_catalog') || 'Katalog Promo & Diskon'}</h3>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#64748b' }}>Memuat katalog...</p>
            ) : rewards.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>Belum ada promo yang tersedia saat ini.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {rewards.map((r, i) => {
                  const canAfford = pointsBalance >= r.points_required;
                  return (
                    <div key={i} style={{ border: '1px solid #cbd5e1', borderRadius: '0.75rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', backgroundColor: canAfford ? '#f0fdf4' : 'white', borderColor: canAfford ? '#86efac' : '#cbd5e1' }}>
                      {r.image_url && (
                        <div style={{ width: '100%', height: '160px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                          {/* objectFit contain to ensure the whole banner is visible without being cropped/gepeng */}
                          <img src={r.image_url} alt={r.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                      )}
                      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ marginBottom: '1rem' }}>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: '#0f172a' }}>{r.name}</h4>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{r.description}</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#059669' }}>{r.points_required} Poin</span>
                          <button 
                            disabled={!canAfford || redeemingId === r.id}
                            onClick={() => redeemReward(r.id)}
                            style={{ 
                              padding: '0.5rem 1rem', 
                              backgroundColor: canAfford ? '#059669' : '#cbd5e1', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '0.5rem', 
                              fontWeight: '600', 
                              cursor: canAfford ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s'
                            }}
                          >
                            {redeemingId === r.id ? 'Menukar...' : canAfford ? 'Tukar Poin' : 'Poin Kurang'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- VOUCHERS SUBTAB --- */}
        {activeSubTab === 'vouchers' && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5rem' }}>🎟️ Kupon Saya</h3>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#64748b' }}>Memuat kupon...</p>
            ) : vouchers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Anda belum memiliki kupon.</p>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>Tukarkan poin Anda di Katalog Reward!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {vouchers.map((v, i) => (
                  <div key={i} 
                    onClick={() => { if (v.status === 'ACTIVE') setActiveVoucher(v); }}
                    style={{ 
                      border: '1px solid',
                      borderColor: v.status === 'ACTIVE' ? '#86efac' : '#e2e8f0', 
                      borderRadius: '0.75rem', 
                      overflow: 'hidden', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      transition: 'all 0.2s', 
                      backgroundColor: v.status === 'ACTIVE' ? '#f0fdf4' : '#f8fafc',
                      cursor: v.status === 'ACTIVE' ? 'pointer' : 'default',
                      opacity: v.status === 'ACTIVE' ? 1 : 0.6
                    }}
                  >
                    <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '60px', height: '60px', backgroundColor: 'white', borderRadius: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {v.rewards_catalog?.image_url ? (
                          <img src={v.rewards_catalog.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '1.5rem' }}>🎟️</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: '#0f172a', fontSize: '0.875rem' }}>{v.rewards_catalog?.name}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 'bold', 
                            padding: '0.1rem 0.4rem', 
                            borderRadius: '0.25rem',
                            backgroundColor: v.status === 'ACTIVE' ? '#dcfce7' : v.status === 'USED' ? '#e2e8f0' : '#fee2e2',
                            color: v.status === 'ACTIVE' ? '#166534' : v.status === 'USED' ? '#475569' : '#991b1b'
                          }}>
                            {v.status === 'ACTIVE' ? 'Aktif' : v.status === 'USED' ? 'Sudah Digunakan' : 'Kedaluwarsa'}
                          </span>
                          {v.status === 'ACTIVE' && (
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              Berlaku s/d {new Date(v.expires_at).toLocaleDateString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {v.status === 'ACTIVE' && (
                      <div style={{ backgroundColor: '#059669', color: 'white', textAlign: 'center', padding: '0.5rem', fontSize: '0.75rem', fontWeight: '600' }}>
                        Ketuk untuk melihat QR Code
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- HISTORY SUBTAB --- */}
        {activeSubTab === 'history' && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5rem' }}>📝 {t('points_history') || 'Riwayat Poin'}</h3>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#64748b' }}>Memuat riwayat...</p>
            ) : mutations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Belum ada riwayat transaksi poin.</p>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>Kumpulkan poin dengan jajan F&B atau Wahana menggunakan gelang ID Anda!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
                {mutations.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i !== mutations.length -1 ? '1px solid #e2e8f0' : 'none', paddingBottom: '1rem' }}>
                    <div>
                      <p style={{ margin: '0 0 0.25rem 0', fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>{m.description || m.mutation_type}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{new Date(m.created_at).toLocaleString('id-ID')}</p>
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '1rem', color: m.points > 0 ? '#10b981' : '#ef4444' }}>
                      {m.points > 0 ? '+' : ''}{m.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Code Modal for Active Voucher */}
      {activeVoucher && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', maxWidth: '90%', width: '350px', textAlign: 'center', position: 'relative' }}>
            <button 
              onClick={() => setActiveVoucher(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>{activeVoucher.rewards_catalog?.name}</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '2rem' }}>Tunjukkan QR Code ini kepada kasir/petugas</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <QRCodeSVG value={activeVoucher.voucher_code} size={200} />
            </div>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Kode Voucher</p>
              <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>{activeVoucher.voucher_code}</p>
            </div>
            
            <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: 0 }}>
              Berlaku hingga: {new Date(activeVoucher.expires_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
