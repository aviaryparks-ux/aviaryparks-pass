"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CreditCard, ShieldCheck, Ticket, Headphones, Lock, ChevronDown, Receipt } from 'lucide-react';

export default function Payment() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [userCount, setUserCount] = useState(1);
  const [ticketPrice, setTicketPrice] = useState(150000);
  const [packageName, setPackageName] = useState('Paket Individu');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('VC'); // Default to Credit Card

  useEffect(() => {
    let storedCount = 1;
    let storedPackageId = '';
    let storedGroupId: string | null = '';
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('tempUserName');
      storedGroupId = localStorage.getItem('tempGroupId');
      const storedCountStr = localStorage.getItem('tempUserCount');
      const pkgId = localStorage.getItem('tempPackageId');
      if (storedName) setUserName(storedName);
      if (storedGroupId) setGroupId(storedGroupId);
      if (storedCountStr) {
        storedCount = parseInt(storedCountStr, 10);
        setUserCount(storedCount);
      }
      if (pkgId) storedPackageId = pkgId;
    }

    const fetchPrice = async () => {
      let activeGroupId = storedGroupId;
      if (!activeGroupId && typeof window !== 'undefined') {
        activeGroupId = localStorage.getItem('tempGroupId');
      }

      let actualUserCount = storedCount;

      if (activeGroupId) {
         const { data: membersData } = await supabase
          .from('members')
          .select('id')
          .eq('group_id', activeGroupId)
          .eq('status', 'PENDING_PAYMENT');
          
         if (membersData && membersData.length > 0) {
            actualUserCount = membersData.length;
            setUserCount(actualUserCount);
            if (typeof window !== 'undefined') {
               localStorage.setItem('tempUserCount', actualUserCount.toString());
            }
         }
      }

      // Cek apakah ini transaksi Addon (apakah ada anggota ACTIVE)
      let isAddonTransaction = false;
      if (activeGroupId) {
         const { data: activeMembers } = await supabase
           .from('members')
           .select('id')
           .eq('group_id', activeGroupId)
           .eq('status', 'ACTIVE')
           .limit(1);
         isAddonTransaction = Boolean(activeMembers && activeMembers.length > 0);
      }

      let packageFound = false;

      if (isAddonTransaction) {
        // Cari paket Addon
        const { data: addonPkg } = await supabase
          .from('ticket_packages')
          .select('*')
          .eq('is_active', true)
          .or('name.ilike.%addon%,name.ilike.%tambahan%')
          .limit(1)
          .single();
          
        if (addonPkg) {
          setTicketPrice(Number(addonPkg.price) * actualUserCount);
          setPackageName(addonPkg.name);
          setPackageId(addonPkg.id);
          packageFound = true;
        }
      }

      if (!packageFound) {
        if (storedPackageId) {
          const { data, error } = await supabase
            .from('ticket_packages')
            .select('*')
            .eq('id', storedPackageId)
            .single();
            
          if (data && !error) {
            setTicketPrice(Number(data.price));
            setPackageName(data.name);
            setPackageId(data.id);
            packageFound = true;
          }
        } 

        if (!packageFound) {
          // Coba deteksi otomatis paket berdasarkan jumlah anggota jika localStorage hilang
          const { data: pkgData } = await supabase
            .from('ticket_packages')
            .select('*')
            .eq('is_active', true)
            .lte('min_qty', actualUserCount)
            .gte('max_qty', actualUserCount)
            .limit(1)
            .single();
          
          if (pkgData) {
            setTicketPrice(Number(pkgData.price));
            setPackageName(pkgData.name);
            setPackageId(pkgData.id);
          } else {
            setTicketPrice(150000 * actualUserCount);
            setPackageName('Harga Normal');
          }
        }
      }
      setFetchingPrice(false);
    };

    fetchPrice();
  }, []);

  const handlePayment = async () => {
    if (!groupId) {
      toast.error('Sesi tidak valid, silakan daftar ulang.');
      router.push('/register');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          packageId,
          amount: ticketPrice,
          customerName: userName,
          paymentMethod
        })
      });

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        // Redirect ke halaman Duitku
        window.location.href = data.paymentUrl;
      } else {
        toast.error('Gagal membuat tagihan pembayaran: ' + (data.error || 'Unknown Error'));
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat memproses pembayaran.');
      setIsLoading(false);
    }
  };

  const totalPayment = ticketPrice;

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', backgroundColor: '#f0fdf4', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Background Image */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/payment_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }}></div>
      
      {/* Header with Logo (Matching Dashboard 3D Tab) */}
      <div style={{ 
          position: 'absolute', 
          top: 0,
          left: '3rem',
          padding: '1rem 2rem 1.5rem 2rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 20
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
        <img src="/logo.png" alt="Aviary Park Logo" style={{ height: '70px', objectFit: 'contain' }} />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 1.5rem 1rem 1.5rem', position: 'relative', zIndex: 10, overflow: 'hidden' }}>
        
        {/* The Card */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '20px', 
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', 
          display: 'flex', 
          overflow: 'hidden', 
          maxWidth: '1000px', 
          width: '100%',
          maxHeight: 'calc(100dvh - 130px)',
          flexDirection: 'row'
        }}>
          
          {/* Left Column (Payment Action) */}
          <div style={{ flex: '1 1 500px', padding: '1.5rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  backgroundColor: '#e6f4ea', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  position: 'relative'
                }}>
                  <CreditCard size={26} color="#065f46" />
                  <div style={{ position: 'absolute', bottom: '0', right: '-4px', backgroundColor: '#065f46', borderRadius: '50%', padding: '3px' }}>
                    <ShieldCheck size={13} color="white" />
                  </div>
                </div>
              </div>
              
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#064e3b', marginBottom: '0.3rem' }}>
                Selesaikan Pembayaran
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.4', margin: 0 }}>
                Halo {userName}, selesaikan pembayaran untuk mengaktifkan tiket keluarga Anda.
              </p>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', color: '#0f172a', fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                Metode Pembayaran
              </label>
              
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <CreditCard size={20} color="#065f46" />
                </div>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '0.65rem 1rem 0.65rem 3rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0', 
                    outline: 'none', 
                    appearance: 'none', 
                    backgroundColor: '#ffffff', 
                    fontSize: '0.95rem', 
                    color: '#0f172a', 
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  <option value="VC">Kartu Kredit / Visa / Mastercard</option>
                  <option value="BC">BCA Virtual Account</option>
                  <option value="M1">Mandiri Virtual Account</option>
                  <option value="B1">BNI Virtual Account</option>
                  <option value="NQ">QRIS (Barcode)</option>
                  <option value="SP">ShopeePay / QRIS</option>
                  <option value="O1">OVO</option>
                  <option value="A1">ATM Bersama</option>
                </select>
                <div style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <ChevronDown size={20} color="#065f46" />
                </div>
              </div>
            </div>

            {/* Payment Logos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <div style={{ height: '50px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.2rem', backgroundColor: '#fff' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1a1a74' }}>VISA</span>
                <span style={{ fontSize: '0.45rem', color: '#64748b', textAlign: 'center' }}>Kartu Kredit</span>
              </div>
              <div style={{ height: '50px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.2rem', backgroundColor: '#fff' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#005baa' }}>BCA</span>
                <span style={{ fontSize: '0.45rem', color: '#64748b', textAlign: 'center' }}>BCA Virtual Account</span>
              </div>
              <div style={{ height: '50px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.2rem', backgroundColor: '#fff' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#f37021' }}>BRI</span>
                <span style={{ fontSize: '0.45rem', color: '#64748b', textAlign: 'center' }}>BRI Virtual Account</span>
              </div>
              <div style={{ height: '50px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.2rem', backgroundColor: '#fff' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#006a84' }}>BNI</span>
                <span style={{ fontSize: '0.45rem', color: '#64748b', textAlign: 'center' }}>BNI Virtual Account</span>
              </div>
              <div style={{ height: '50px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.2rem', backgroundColor: '#fff' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#4c2a86' }}>OVO</span>
                <span style={{ fontSize: '0.45rem', color: '#64748b', textAlign: 'center' }}>OVO E-Wallet</span>
              </div>
              <div style={{ height: '50px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.2rem', backgroundColor: '#fff' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#118ee9' }}>DANA</span>
                <span style={{ fontSize: '0.45rem', color: '#64748b', textAlign: 'center' }}>DANA E-Wallet</span>
              </div>
              <div style={{ height: '50px', border: '2px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.2rem', backgroundColor: '#fff' }}>
                <div style={{ display: 'flex', gap: '1px' }}>
                  <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#d62027' }}>Q</span>
                  <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#f37021' }}>R</span>
                  <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#0070bb' }}>I</span>
                  <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#009247' }}>S</span>
                </div>
                <span style={{ fontSize: '0.45rem', color: '#64748b', textAlign: 'center' }}>QRIS</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ backgroundColor: '#059669', borderRadius: '50%', padding: '4px' }}>
                <ShieldCheck size={16} color="white" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.15rem 0', color: '#0f172a', fontWeight: '700', fontSize: '0.9rem' }}>Keamanan Transaksi</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  Anda akan diarahkan ke halaman resmi Duitku<br/>untuk pembayaran yang aman dan terenkripsi.
                </p>
              </div>
            </div>

<style>{`
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4); transform: scale(1); }
    50% { box-shadow: 0 8px 30px rgba(5, 150, 105, 0.7); transform: scale(1.02); }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  .pay-btn {
    animation: pulse-glow 2s ease-in-out infinite;
    background: linear-gradient(90deg, #059669, #34d399, #059669);
    background-size: 200% auto;
    animation: pulse-glow 2s ease-in-out infinite, shimmer 3s linear infinite;
  }
  .pay-btn:hover {
    transform: scale(1.04) !important;
    box-shadow: 0 12px 40px rgba(5, 150, 105, 0.6) !important;
  }
  .pay-btn:disabled {
    animation: none;
    background: #94a3b8;
  }
`}</style>
            <button 
              onClick={handlePayment} 
              disabled={isLoading || fetchingPrice}
              className={(!isLoading && !fetchingPrice) ? 'pay-btn' : ''}
              style={{ 
                width: '100%', 
                padding: '0.875rem', 
                fontSize: '1rem', 
                fontWeight: '700', 
                color: 'white', 
                backgroundColor: (isLoading || fetchingPrice) ? '#94a3b8' : '#059669', 
                border: 'none', 
                borderRadius: '32px', 
                cursor: (isLoading || fetchingPrice) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Lock size={18} />
              {isLoading ? 'Memproses...' : `Bayar Sekarang (Rp ${totalPayment.toLocaleString('id-ID')})`}
            </button>
            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} /> Pembayaran Anda aman dan terenkripsi
            </p>
          </div>

          {/* Right Column (Summary) */}
          <div style={{ flex: '1 1 350px', backgroundColor: '#ffffff', padding: '3rem', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#064e3b', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              Ringkasan Pembayaran
            </h3>

            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ color: '#475569', fontSize: '0.95rem' }}>Paket Terpilih</span>
                <span style={{ color: '#059669', fontWeight: '700', fontSize: '0.95rem' }}>{fetchingPrice ? '...' : packageName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <span style={{ color: '#475569', fontSize: '0.95rem' }}>Jumlah Anggota</span>
                <span style={{ color: '#0f172a', fontSize: '0.95rem' }}>{userCount} Orang</span>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', marginBottom: '1.5rem' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#0f172a', fontWeight: '800', fontSize: '1.05rem' }}>Total Tagihan</span>
                <span style={{ color: '#059669', fontWeight: '800', fontSize: '1.25rem' }}>{fetchingPrice ? '...' : `Rp ${totalPayment.toLocaleString('id-ID')}`}</span>
              </div>
            </div>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', flex: 1 }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: '#e6f4ea', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                  <Ticket size={20} color="#065f46" />
                </div>
                <div>
                  <h5 style={{ margin: '0 0 0.25rem 0', fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>Tiket Langsung Aktif</h5>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>Tiket akan langsung aktif setelah pembayaran berhasil.</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: '#e6f4ea', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={20} color="#065f46" />
                </div>
                <div>
                  <h5 style={{ margin: '0 0 0.25rem 0', fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>Aman & Terpercaya</h5>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>Transaksi aman menggunakan sistem pembayaran resmi.</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: '#e6f4ea', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                  <Headphones size={20} color="#065f46" />
                </div>
                <div>
                  <h5 style={{ margin: '0 0 0.25rem 0', fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>Bantuan 24 Jam</h5>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>Butuh bantuan? Hubungi kami kapan saja.</p>
                </div>
              </div>
            </div>
            

          </div>
        </div>

      </div>

      {/* Footer */}
      <div style={{ padding: '0.6rem 2rem', textAlign: 'center', color: '#475569', fontSize: '0.8rem', position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
        <span>© 2024 Aviary Park Indonesia. All rights reserved.</span>
        <span style={{ color: '#cbd5e1' }}>|</span>
        <a href="#" style={{ color: '#64748b', textDecoration: 'none' }}>Kebijakan Privasi</a>
        <span style={{ color: '#cbd5e1' }}>|</span>
        <a href="#" style={{ color: '#64748b', textDecoration: 'none' }}>Syarat & Ketentuan</a>
      </div>
    </div>
  );
}
