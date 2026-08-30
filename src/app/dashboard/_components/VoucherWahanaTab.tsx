import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/contexts/LanguageContext';
import toast from 'react-hot-toast';

export default function VoucherWahanaTab({ user }: { user: any }) {
  const { t } = useLanguage();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Top-Up States
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'SINGLE' | 'BUNDLE'>('SINGLE');
  const [availableWahanas, setAvailableWahanas] = useState<any[]>([]);
  const [availableBundles, setAvailableBundles] = useState<any[]>([]);
  const [selectedWahana, setSelectedWahana] = useState<any>(null);
  const [selectedBundle, setSelectedBundle] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('VC');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      // Periksa apakah baru redirect dari Duitku setelah bayar
      const checkPaymentReturn = async () => {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const orderId = params.get('merchantOrderId');
          const resultCode = params.get('resultCode');

          if (orderId && (resultCode === '00' || orderId.startsWith('WAHANA-') || orderId.startsWith('BUNDLE-'))) {
            try {
              const res = await fetch('/api/payment/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, resultCode })
              });
              const data = await res.json();
              if (data.status === 'SUCCESS' || data.success) {
                toast.success('🎉 Pembayaran berhasil! Kuota wahana telah ditambahkan.');
              }
            } catch (e) {
              console.error('Check payment return error:', e);
            }
          }
        }
        fetchVouchers();
      };

      checkPaymentReturn();
    }
  }, [user]);

  const fetchVouchers = async () => {
    try {
      const res = await fetch(`/api/visitor/vouchers?member_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setVouchers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableItems = async () => {
    try {
      // 1. Ambil wahana satuan
      const resW = await fetch('/api/admin/wahanas');
      if (resW.ok) {
        const dataW = await resW.json();
        const activeW = dataW.filter((w: any) => w.is_active && w.topup_price > 0);
        setAvailableWahanas(activeW);
        if (activeW.length > 0) setSelectedWahana(activeW[0]);
      }

      // 2. Ambil paket bundling
      const resB = await fetch('/api/public/packages?category=BUNDLING');
      if (resB.ok) {
        const dataB = await resB.json();
        if (dataB.data && dataB.data.length > 0) {
          setAvailableBundles(dataB.data);
          setSelectedBundle(dataB.data[0]);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat daftar wahana.');
    }
  };

  const handleOpenTopup = () => {
    setShowTopupModal(true);
    setQuantity(1);
    fetchAvailableItems();
  };

  const handleCheckout = async () => {
    if (purchaseType === 'SINGLE' && (!selectedWahana || quantity < 1)) return;
    if (purchaseType === 'BUNDLE' && (!selectedBundle || quantity < 1)) return;
    
    setIsProcessing(true);
    try {
      const payload: any = {
        memberId: user.id,
        quantity: quantity,
        paymentMethod: paymentMethod,
        customerName: user.name,
        customerEmail: user.email || 'no-email@aviarypark.com',
        customerPhone: user.phone || '08123456789'
      };

      if (purchaseType === 'BUNDLE') {
        payload.bundleId = selectedBundle.id;
      } else {
        payload.wahanaId = selectedWahana.id;
      }

      const res = await fetch('/api/payment/create-wahana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error(data.error || 'Gagal membuat pembayaran');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPrice = purchaseType === 'BUNDLE' 
    ? Number(selectedBundle?.price || 0) 
    : Number(selectedWahana?.topup_price || 0);

  return (
    <div className="tab-fade-in" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
          Voucher Wahana
        </h2>
        <button 
          onClick={handleOpenTopup}
          style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Beli Tiket
        </button>
      </div>

      {vouchers.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#334155', marginBottom: '1rem' }}>Scan Barcode Ini di Gerbang Wahana</h3>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <QRCodeSVG value={user?.id || user?.nik || 'UNKNOWN'} size={200} />
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Tunjukkan QR Code ini kepada petugas. Sistem akan otomatis memotong kuota wahana yang sesuai.
          </p>
        </div>
      )}

      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#334155' }}>
        Sisa Kuota Wahana Anda
      </h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</div>
      ) : vouchers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 2rem', backgroundColor: '#fff', borderRadius: '1rem', color: '#64748b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '1rem', color: '#94a3b8' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8c-5 0-6 3-6 4v14a2 2 0 0 0 2 2z"/>
              <line x1="14" x2="20" y1="12" y2="12"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>Belum Ada Voucher</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Anda belum memiliki kuota wahana aktif.</p>
          <button 
            onClick={handleOpenTopup}
            style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Beli Tiket Wahana
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {vouchers.map((v) => (
            <div key={v.id} style={{ backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 'bold' }}>
                  {v.wahanas?.name || 'Wahana'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  Berlaku s/d: {new Date(v.valid_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{v.quota}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Tiket</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Top-Up Wahana & Bundling */}
      {showTopupModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', padding: '1.75rem', width: '100%', maxWidth: '440px', position: 'relative', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.2rem 0' }}>Beli Tiket Wahana</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>Pilih wahana favorit atau paket hemat</p>
              </div>
              <button 
                onClick={() => setShowTopupModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Type Selector (Satuan vs Bundling) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '1.25rem', backgroundColor: '#f1f5f9', padding: '0.3rem', borderRadius: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setPurchaseType('SINGLE')}
                style={{
                  padding: '0.6rem 0.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: purchaseType === 'SINGLE' ? 'white' : 'transparent',
                  color: purchaseType === 'SINGLE' ? '#0f172a' : '#64748b',
                  boxShadow: purchaseType === 'SINGLE' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Wahana Satuan
              </button>
              <button
                type="button"
                onClick={() => setPurchaseType('BUNDLE')}
                style={{
                  padding: '0.6rem 0.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: purchaseType === 'BUNDLE' ? '#059669' : 'transparent',
                  color: purchaseType === 'BUNDLE' ? 'white' : '#64748b',
                  boxShadow: purchaseType === 'BUNDLE' ? '0 2px 4px rgba(5,150,105,0.2)' : 'none'
                }}
              >
                Paket Bundling
              </button>
            </div>
            
            {purchaseType === 'SINGLE' && availableWahanas.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', margin: '2rem 0' }}>Memuat daftar wahana...</p>
            ) : purchaseType === 'BUNDLE' && availableBundles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #cbd5e1' }}>
                <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>Belum ada paket bundling aktif saat ini.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {purchaseType === 'SINGLE' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '0.4rem' }}>Pilih Wahana</label>
                    <div style={{ position: 'relative' }}>
                      <select 
                        value={selectedWahana?.id || ''} 
                        onChange={(e) => setSelectedWahana(availableWahanas.find(w => w.id === e.target.value))}
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', fontWeight: '600', color: '#0f172a', backgroundColor: '#f8fafc', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                      >
                        {availableWahanas.map(w => (
                          <option key={w.id} value={w.id}>{w.name} — Rp {w.topup_price.toLocaleString('id-ID')}</option>
                        ))}
                      </select>
                      <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '0.4rem' }}>Pilih Paket Bundling</label>
                    <div style={{ position: 'relative' }}>
                      <select 
                        value={selectedBundle?.id || ''} 
                        onChange={(e) => setSelectedBundle(availableBundles.find(b => b.id === e.target.value))}
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.6rem', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', fontWeight: '600', color: '#0f172a', backgroundColor: '#f8fafc', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                      >
                        {availableBundles.map(b => (
                          <option key={b.id} value={b.id}>{b.name} — Rp {Number(b.price).toLocaleString('id-ID')}</option>
                        ))}
                      </select>
                      <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>

                    {/* Rincian isi bundling */}
                    {selectedBundle?.package_wahanas && (
                      <div style={{ marginTop: '0.6rem', padding: '0.85rem', backgroundColor: '#ecfdf5', borderRadius: '0.6rem', border: '1px solid #a7f3d0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#065f46', fontWeight: '700', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          Benefit yang didapatkan:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#047857', fontSize: '0.82rem', lineHeight: '1.4' }}>
                          {selectedBundle.package_wahanas.map((pw: any, idx: number) => (
                            <li key={idx}><strong>{pw.wahanas?.name || 'Wahana'}</strong>: {pw.quantity} Tiket</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Jumlah Tiket */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '0.4rem' }}>Jumlah Pembelian</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '0.6rem', border: '1.5px solid #e2e8f0', width: 'fit-content' }}>
                    <button 
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                      style={{ width: '32px', height: '32px', borderRadius: '0.4rem', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '1.15rem', fontWeight: '800', width: '2.5rem', textAlign: 'center', color: '#0f172a' }}>{quantity}</span>
                    <button 
                      type="button"
                      onClick={() => setQuantity(quantity + 1)} 
                      style={{ width: '32px', height: '32px', borderRadius: '0.4rem', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Pilihan Metode Pembayaran Berlogo */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '0.5rem' }}>
                    Metode Pembayaran
                  </label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                    {[
                      { code: 'BC', name: 'BCA VA', color: '#005baa', badge: 'BCA' },
                      { code: 'M1', name: 'Mandiri VA', color: '#003366', badge: 'MANDIRI' },
                      { code: 'B1', name: 'BNI VA', color: '#f15a24', badge: 'BNI' },
                      { code: 'NQ', name: 'QRIS (Gopay/Shopee)', color: '#d62027', badge: 'QRIS' },
                      { code: 'VC', name: 'Kartu Kredit / Debit', color: '#1a1a74', badge: 'VISA/MC' },
                      { code: 'O1', name: 'OVO E-Wallet', color: '#4c2a86', badge: 'OVO' },
                    ].map((m) => {
                      const isSelected = paymentMethod === m.code;
                      return (
                        <div
                          key={m.code}
                          onClick={() => setPaymentMethod(m.code)}
                          style={{
                            border: isSelected ? '2px solid #059669' : '1.5px solid #e2e8f0',
                            backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                            borderRadius: '0.6rem',
                            padding: '0.6rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: '900', 
                            color: m.color, 
                            backgroundColor: '#f1f5f9', 
                            padding: '0.2rem 0.4rem', 
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1'
                          }}>
                            {m.badge}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: isSelected ? '700' : '500', color: isSelected ? '#065f46' : '#334155' }}>
                            {m.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ringkasan Biaya */}
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.85rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem', color: '#64748b' }}>
                    <span>Harga Satuan</span>
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>Rp {currentPrice.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.2rem', fontWeight: '800', color: '#059669', marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.95rem', color: '#0f172a' }}>Total Tagihan</span>
                    <span>Rp {(currentPrice * quantity).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Tombol Checkout */}
                <button 
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  style={{ 
                    backgroundColor: isProcessing ? '#94a3b8' : '#059669', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0.9rem', 
                    borderRadius: '0.75rem', 
                    fontWeight: '800', 
                    fontSize: '1rem', 
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.3)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isProcessing ? (
                    'Memproses Pembayaran...'
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      Lanjutkan Pembayaran
                    </>
                  )}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', margin: '-0.5rem 0 0 0' }}>
                  🔒 Pembayaran dienkripsi dan diproses aman via Duitku Gateway
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
