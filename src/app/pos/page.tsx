"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function POSPage() {
  const [statusMsg, setStatusMsg] = useState('Memuat data...');
  const [identifiedUser, setIdentifiedUser] = useState<any>(null);
  const identifiedUserRef = useRef<any>(null);
  
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  const [txMode, setTxMode] = useState<'TOPUP' | 'VOUCHER'>('TOPUP');
  
  // Topup / Voucher State
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [wahanas, setWahanas] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedWahanaId, setSelectedWahanaId] = useState<string>('');
  const [topupType, setTopupType] = useState<'SATUAN' | 'PAKET'>('SATUAN');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [topupQuantity, setTopupQuantity] = useState<number>(1);
  const [memberVouchers, setMemberVouchers] = useState<any[]>([]);
  const [useVoucherQuantity, setUseVoucherQuantity] = useState<number>(1);
  
  const [posTerminals, setPosTerminals] = useState<any[]>([]);
  const [posLocation, setPosLocation] = useState<string>('RESTO');
  const [posTerminalName, setPosTerminalName] = useState<string>('Terminal (Fallback)');
  const [isProcessing, setIsProcessing] = useState(false);

  // Cashier Auth State
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [cashierSession, setCashierSession] = useState<any>(null);
  const [selectedCashier, setSelectedCashier] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');

  // Receipt Modal State
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // QRIS Payment Modal State (100% Cashless Gateway)
  const [qrisModal, setQrisModal] = useState(false);
  const [qrisData, setQrisData] = useState<{
    qrUrl?: string;
    qrString?: string | null;
    amount: number;
    title: string;
    orderId: string;
    qty: number;
    unitPrice?: number;
    type: 'SATUAN' | 'PAKET';
    targetId: string;
  } | null>(null);

  // Auto-Polling Status Pembayaran Realtime (Setiap 2.5 Detik)
  useEffect(() => {
    if (!qrisModal || !qrisData || !identifiedUser) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const checkRes = await fetch('/api/payment/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            groupId: identifiedUser.id, 
            orderId: qrisData.orderId 
          })
        });
        const checkData = await checkRes.json();

        if (isSubscribed && checkData.success && checkData.status === 'SUCCESS') {
          toast.success('🎉 Pembayaran QRIS Berhasil Masuk!');
          setQrisModal(false);

          setLastReceipt({
            type: qrisData.type === 'PAKET' ? 'PAKET' : 'TOPUP',
            title: qrisData.title,
            memberName: identifiedUser.name,
            nik: identifiedUser.nik,
            amount: qrisData.amount,
            qty: qrisData.qty,
            unitPrice: qrisData.unitPrice,
            cashier: cashierSession?.name || 'Kasir',
            wahana: cashierSession?.wahana_name || 'Wahana',
            time: new Date().toLocaleString('id-ID'),
            invoice: qrisData.orderId
          });
          setShowReceiptModal(true);
          setQrisData(null);
          resetTransaction();
        }
      } catch (err) {
        // Abaikan error polling silent
      }
    }, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [qrisModal, qrisData, identifiedUser, cashierSession]);

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [termRes, cashRes, wahanasRes, pkgRes, meRes] = await Promise.all([
          fetch('/api/pos/terminals'),
          fetch('/api/pos/cashiers'),
          fetch('/api/pos/wahanas'),
          fetch('/api/public/packages?category=TOPUP_BUNDLE'),
          fetch('/api/auth/system-me')
        ]);
        
        const termJson = await termRes.json();
        if (termJson.success && termJson.data.length > 0) {
          setPosTerminals(termJson.data);
          setPosLocation(termJson.data[0].category);
          setPosTerminalName(termJson.data[0].name);
        }

        const cashJson = await cashRes.json();
        if (cashJson.success && cashJson.data.length > 0) {
          setCashiers(cashJson.data);
          setSelectedCashier(cashJson.data[0]);
        }
        
        if (wahanasRes.ok) {
          const wahanasData = await wahanasRes.json();
          const activeWahanas = wahanasData.filter((w: any) => w.is_active && w.topup_price > 0);
          setWahanas(activeWahanas);
          if (activeWahanas.length > 0) setSelectedWahanaId(activeWahanas[0].id);
        }
        
        const pkgJson = await pkgRes.json();
        if (pkgJson.success) {
          setPackages(pkgJson.data);
          if (pkgJson.data.length > 0) setSelectedPackageId(pkgJson.data[0].id);
        }

        // Auto-login session if cashier already authenticated via /system-login
        if (meRes.ok) {
          const meJson = await meRes.json();
          if (meJson.success && meJson.user) {
            setCashierSession(meJson.user);
            if (meJson.user.wahana_id) {
              setSelectedWahanaId(meJson.user.wahana_id);
            }
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchInitData();
  }, []);

  const performLookup = async (queryId: string) => {
    const trimmed = queryId.trim();
    if (!trimmed) return;

    try {
      const res = await fetch(`/api/pos/lookup?id=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const result = await res.json();
        if (result.data) {
          setIdentifiedUser(result.data);
          identifiedUserRef.current = result.data;
          setBarcodeInput('');
          setStatusMsg('Member Ditemukan: ' + result.data.name);

          // Fetch vouchers
          try {
            const vRes = await fetch(`/api/pos/member-vouchers?member_id=${result.data.id}`);
            if (vRes.ok) {
              const vJson = await vRes.json();
              if (vJson.success && vJson.data) {
                setMemberVouchers(vJson.data);
                const activeV = vJson.data.filter((v: any) => v.quota > 0);
                if (activeV.length > 0) {
                  setSelectedWahanaId(activeV[0].wahana_id);
                }
              }
            }
          } catch (err) {
            console.error('Failed to load member vouchers', err);
          }
        } else {
          toast.error('Member tidak ditemukan!');
        }
      } else {
        toast.error('Member tidak ditemukan!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal mencari member');
    }
  };

  const handleBarcodeSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await performLookup(barcodeInput);
    }
  };

  useEffect(() => {
    if (txMode === 'VOUCHER' && memberVouchers.length > 0) {
      const activeVouchers = memberVouchers.filter(v => v.quota > 0);
      if (activeVouchers.length > 0) {
        if (!selectedWahanaId || !activeVouchers.some(v => v.wahana_id === selectedWahanaId)) {
          setSelectedWahanaId(activeVouchers[0].wahana_id);
        }
      }
    }
  }, [txMode, memberVouchers, selectedWahanaId]);

  const resetTransaction = () => {
    setIdentifiedUser(null);
    identifiedUserRef.current = null;
    setInvoiceNumber('');
    setTopupQuantity(1);
    setUseVoucherQuantity(1);
    setMemberVouchers([]);
    setBarcodeInput('');
    setStatusMsg('Sistem POS siap. Scan barcode atau ketik Member ID.');
    
    // Kembalikan fokus ke input barcode setelah proses selesai
    setTimeout(() => {
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    }, 100);
  };

  // ── AUTO-FOCUS & GLOBAL SCANNER CAPTURE ──
  // Menjaga fokus selalu aktif pada input barcode agar kasir tidak perlu mengklik mouse sama sekali
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Jangan intercept jika user sedang mengetik di input/select/textarea lain atau jika sistem terkunci
      if (!cashierSession || showReceiptModal || qrisModal) return;

      const activeTag = document.activeElement?.tagName.toLowerCase();
      const activeType = (document.activeElement as HTMLInputElement)?.type?.toLowerCase();

      // Jika fokus bukan di text/number input selain barcode, langsung fokuskan ke barcode scanner
      if (document.activeElement !== barcodeInputRef.current && activeTag !== 'select' && activeTag !== 'textarea') {
        if (e.key.length === 1 || e.key === 'Enter') {
          barcodeInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cashierSession, showReceiptModal, qrisModal]);

  // Pastikan input selalu terfokus saat halaman aktif / modal ditutup
  useEffect(() => {
    if (cashierSession && !showReceiptModal && !qrisModal) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 150);
    }
  }, [cashierSession, showReceiptModal, qrisModal, identifiedUser]);

  const calculateTopupTotal = () => {
    if (topupType === 'PAKET') {
      const pkg = packages.find(p => p.id === selectedPackageId);
      if (!pkg) return 0;
      return pkg.price;
    } else {
      const wahana = wahanas.find(w => w.id === selectedWahanaId);
      if (!wahana) return 0;
      return wahana.topup_price * topupQuantity;
    }
  };

  const handleCheckout = async () => {
    if (!identifiedUser) return;
    
    setIsProcessing(true);
    try {
      const auditTerminalName = `${posTerminalName} (${cashierSession?.name})`;

      if (txMode === 'TOPUP') {
        if (topupType === 'PAKET') {
          if (!selectedPackageId) {
            toast.error('Data paket tidak valid');
            setIsProcessing(false);
            return;
          }
          const selectedPkg = packages.find(p => p.id === selectedPackageId);
          const pkgAmount = Number(selectedPkg?.price || 0);

          // 100% Cashless: Panggil Duitku QRIS API
          const payRes = await fetch('/api/payment/create-wahana', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberId: identifiedUser.id,
              bundleId: selectedPackageId,
              quantity: 1,
              customerName: identifiedUser.name,
              customerEmail: identifiedUser.email || 'kasir@aviarypark.com',
              customerPhone: identifiedUser.phone || '081234567890',
              paymentMethod: 'SP' // ShopeePay / QRIS Duitku
            })
          });

          const payData = await payRes.json();
          if (payRes.ok && payData.success) {
            setQrisData({
              qrUrl: payData.paymentUrl,
              qrString: payData.qrString,
              amount: pkgAmount,
              title: selectedPkg?.name || 'Paket Bundling',
              orderId: payData.merchantOrderId,
              qty: 1,
              type: 'PAKET',
              targetId: selectedPackageId
            });
            setQrisModal(true);
          } else {
            toast.error('Gagal membuat QRIS: ' + (payData.error || 'Server error'));
          }
          setIsProcessing(false);
          return;
        }

        // TOPUP WAHANA SATUAN MODE — gunakan wahana terikat dari akun kasir atau wahana yang dipilih
        const wahanaIdToUse = cashierSession?.wahana_id || selectedWahanaId;
        if (!wahanaIdToUse || topupQuantity < 1) {
          toast.error('Silakan pilih wahana terlebih dahulu.');
          setIsProcessing(false);
          return;
        }

        const activeW = wahanas.find((w: any) => w.id === wahanaIdToUse);
        const totalAmt = (activeW?.topup_price || 0) * topupQuantity;

        // 100% Cashless: Panggil Duitku QRIS API untuk Satuan
        const payRes = await fetch('/api/payment/create-wahana', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: identifiedUser.id,
            wahanaId: wahanaIdToUse,
            quantity: topupQuantity,
            customerName: identifiedUser.name,
            customerEmail: identifiedUser.email || 'kasir@aviarypark.com',
            customerPhone: identifiedUser.phone || '081234567890',
            paymentMethod: 'SP' // ShopeePay / QRIS Duitku
          })
        });

        const payData = await payRes.json();
        if (payRes.ok && payData.success) {
          setQrisData({
            qrUrl: payData.paymentUrl,
            qrString: payData.qrString,
            amount: totalAmt,
            title: activeW?.name || 'Wahana Satuan',
            orderId: payData.merchantOrderId,
            qty: topupQuantity,
            unitPrice: activeW?.topup_price || 0,
            type: 'SATUAN',
            targetId: wahanaIdToUse
          });
          setQrisModal(true);
        } else {
          toast.error('Gagal membuat QRIS: ' + (payData.error || 'Server error'));
        }
        setIsProcessing(false);
        return;
      } else if (txMode === 'VOUCHER') {
        const wahanaIdToUse = cashierSession?.wahana_id || selectedWahanaId;
        if (!wahanaIdToUse || useVoucherQuantity < 1) {
          toast.error('Data wahana tidak valid');
          setIsProcessing(false);
          return;
        }

        const activeWName = cashierSession?.wahana_name || wahanas.find((w: any) => w.id === wahanaIdToUse)?.name || memberVouchers.find((v: any) => v.wahana_id === wahanaIdToUse)?.wahanas?.name || 'Wahana';

        const res = await fetch('/api/pos/use-voucher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            member_id: identifiedUser.id,
            wahana_id: wahanaIdToUse,
            quantity: useVoucherQuantity,
            terminal_name: auditTerminalName
          })
        });

        const result = await res.json();
        if (result.success) {
          toast.success(`Penukaran Tiket Berhasil!\nSisa tiket: ${result.data.remaining_quota}`);
          setLastReceipt({
            type: 'VOUCHER',
            title: `Tiket Masuk Wahana: ${activeWName}`,
            memberName: identifiedUser.name,
            nik: identifiedUser.nik,
            amount: 0,
            qty: useVoucherQuantity,
            remainingQuota: result.data.remaining_quota,
            cashier: cashierSession?.name || 'Kasir',
            wahana: activeWName,
            time: new Date().toLocaleString('id-ID'),
            invoice: `TCK-${Date.now()}`
          });
          setShowReceiptModal(true);
          resetTransaction();
        } else {
          toast.error('Gagal menggunakan tiket: ' + result.error);
        }
      }
    } catch(e) {
      toast.error('Terjadi kesalahan.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePinSubmit = async () => {
    if (!selectedCashier) return;
    try {
      const res = await fetch('/api/pos/cashiers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedCashier.name, pin: pinInput })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Merge wahana info from selectedCashier (which has wahana_id & wahana_name)
        const session = {
          ...data.cashier,
          wahana_id: selectedCashier.wahana_id || null,
          wahana_name: selectedCashier.wahana_name || null
        };
        setCashierSession(session);
        // Auto-set selectedWahanaId to cashier's bound wahana
        if (selectedCashier.wahana_id) {
          setSelectedWahanaId(selectedCashier.wahana_id);
        }
        setPinInput('');
        toast.success(`Selamat bekerja, ${data.cashier.name}! Wahana: ${selectedCashier.wahana_name || 'Semua'}`);
      } else {
        toast.error('PIN Salah! Silakan coba lagi.');
        setPinInput('');
      }
    } catch (e) {
      toast.error('Terjadi kesalahan verifikasi PIN.');
      setPinInput('');
    }
  };

  if (!cashierSession) {
    return (
      <div style={{ minHeight: '100vh', background: '#022c22', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Toaster position="top-center" />
        <div style={{ background: 'white', padding: '3rem 2.5rem', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#ecfdf5', border: '4px solid #10b981', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 0.5rem 0' }}>Sistem Terkunci</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '2rem' }}>Pilih nama Anda dan masukkan PIN Kasir (6 Digit) untuk membuka POS.</p>

          <select 
            value={selectedCashier?.id || ''} 
            onChange={(e) => setSelectedCashier(cashiers.find(c => c.id === e.target.value) || cashiers[0])}
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 'bold' }}
          >
            {cashiers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.wahana_name ? `(🎡 ${c.wahana_name})` : ''}
              </option>
            ))}
          </select>

          <input 
            type="password" 
            value={pinInput} 
            disabled
            placeholder="• • • • • •"
            style={{ width: '100%', padding: '1rem', fontSize: '2rem', letterSpacing: '0.5em', textAlign: 'center', borderRadius: '0.5rem', border: '1px solid #cbd5e1', marginBottom: '1.5rem', backgroundColor: '#f8fafc' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((key) => (
              <button 
                key={key} 
                onClick={() => {
                  if (key === 'C') setPinInput('');
                  else if (key === 'OK') handlePinSubmit();
                  else if (pinInput.length < 6) setPinInput(prev => prev + key);
                }}
                style={{ padding: '1.25rem', fontSize: '1.25rem', fontWeight: 'bold', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: key === 'OK' ? '#10b981' : key === 'C' ? '#fef2f2' : 'white', color: key === 'OK' ? 'white' : key === 'C' ? '#ef4444' : '#1e293b', cursor: 'pointer', transition: 'all 0.1s' }}
              >
                {key}
              </button>
            ))}
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>Terminal merekam aktivitas audit Anda.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: `url('/hero-new.jpg') center center / cover no-repeat`,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden'
    }}>
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header Panel with Gate Style */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '1.25rem 3rem', zIndex: 10 }}>
        
        {/* Hanging Left Logo Tab */}
        <div style={{ 
          position: 'absolute', 
          left: '3rem', 
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
          <img src="/logo.png" alt="Aviary Park Indonesia" style={{ height: '55px', width: 'auto' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '13rem', gap: '1rem' }}>
          <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.4rem 1.2rem', borderRadius: '2rem', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></div>
            POS KASIR
          </div>
          {cashierSession?.wahana_name && (
            <div style={{ backgroundColor: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0', padding: '0.4rem 1rem', borderRadius: '2rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
              {cashierSession.wahana_name}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '0.4rem 1rem', borderRadius: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a' }}>{cashierSession?.name}</span>
          </div>
          <button 
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
                localStorage.removeItem('system_username');
                localStorage.removeItem('system_role');
                window.location.href = '/system-login';
              } catch (e) {
                window.location.href = '/system-login';
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.4rem 1.2rem', borderRadius: '2rem', fontWeight: 'bold', fontSize: '0.9rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Keluar (Logout)
          </button>
        </div>
      </div>

      <main style={{ padding: '1rem 3rem 2.5rem 3rem', flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', zIndex: 10, maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* Left Column: Scanner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Wahana Info Badge */}
          <div style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontWeight: 'bold' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#064e3b', fontSize: '1.2rem' }}>
                {cashierSession?.wahana_name || 'Wahana Bebas'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {cashierSession?.wahana_id ? 'Terminal khusus wahana ini' : 'Terminal POS & Top-Up Umum'}
              </div>
            </div>
          </div>

          <div style={{ padding: '2rem', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.25rem', color: '#0f172a' }}>Identifikasi Member</h3>
            
            <div style={{ background: '#f8fafc', padding: '2.5rem 1.5rem', borderRadius: '1rem', border: '2px dashed #cbd5e1', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '3.5rem', height: '3.5rem', borderRadius: '50%', backgroundColor: '#ecfdf5', marginBottom: '1rem' }}>
                <QrCode size={28} color="#059669" />
              </div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a', fontSize: '1.05rem' }}>Identifikasi Member (Scanner / Barcode)</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>Arahkan scanner ke QR Code E-Card pelanggan atau ketik Member ID lalu tekan Enter.</p>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (barcodeInput.trim()) {
                    performLookup(barcodeInput);
                  }
                }}
              >
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#334155', fontSize: '0.9rem' }}>Scan Barcode / ID Member</label>
                <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '450px', margin: '0 auto' }}>
                  <input 
                    type="text" 
                    autoFocus
                    ref={barcodeInputRef}
                    placeholder="Scan Barcode / Tempel ID..." 
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleBarcodeSubmit}
                    style={{ flex: 1, padding: '0.85rem 1.25rem', borderRadius: '0.75rem', border: '2px solid #10b981', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', outline: 'none', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                  />
                  <button
                    type="submit"
                    style={{ padding: '0.85rem 1.25rem', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Cari
                  </button>
                </div>
              </form>
            </div>
            {identifiedUser && (
              <button 
                onClick={resetTransaction}
                style={{ width: '100%', marginTop: '1.25rem', padding: '0.85rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Scan Ulang
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Checkout Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {identifiedUser ? (
            <div style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '1.25rem', padding: '2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
              
              {/* Member Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ width: '56px', height: '56px', background: '#10b981', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '1.5rem', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(16,185,129,0.3)' }}>
                  {identifiedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 'bold', color: '#0f172a' }}>{identifiedUser.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}>Member Aktif</span>
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      NIK: {identifiedUser.nik && identifiedUser.nik.length === 16 ? `${identifiedUser.nik.substring(0, 6)}******${identifiedUser.nik.substring(12)}` : identifiedUser.nik || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transaction Mode Tabs */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button 
                  onClick={() => setTxMode('TOPUP')}
                  style={{ flex: 1, padding: '0.85rem', borderRadius: '0.75rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: txMode === 'TOPUP' ? '#059669' : '#f1f5f9', color: txMode === 'TOPUP' ? 'white' : '#64748b', transition: 'all 0.2s', fontSize: '0.95rem' }}
                >
                  Beli Tiket
                </button>
                <button 
                  onClick={() => setTxMode('VOUCHER')}
                  style={{ flex: 1, padding: '0.85rem', borderRadius: '0.75rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: txMode === 'VOUCHER' ? '#d97706' : '#f1f5f9', color: txMode === 'VOUCHER' ? 'white' : '#64748b', transition: 'all 0.2s', fontSize: '0.95rem' }}
                >
                  Tukar Tiket
                </button>
              </div>

              {txMode === 'TOPUP' && (
                <div>
                  {/* Top-Up Type Selection */}
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '600', color: '#334155' }}>
                      <input type="radio" name="topupType" checked={topupType === 'SATUAN'} onChange={() => setTopupType('SATUAN')} style={{ width: '18px', height: '18px' }} />
                      Wahana Satuan
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '600', color: '#334155' }}>
                      <input type="radio" name="topupType" checked={topupType === 'PAKET'} onChange={() => setTopupType('PAKET')} style={{ width: '18px', height: '18px' }} />
                      Paket Bundling
                    </label>
                  </div>

                  {topupType === 'SATUAN' ? (
                    <div style={{ marginBottom: '1.5rem' }}>
                      {cashierSession?.wahana_id ? (
                        <div style={{ padding: '1rem', background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '0.75rem', marginBottom: '1.25rem' }}>
                          <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: '600', marginBottom: '0.25rem' }}>Wahana Terminal Ini:</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#166534' }}>
                            {cashierSession.wahana_name}
                          </div>
                          {(() => {
                            const w = wahanas.find((w: any) => w.id === cashierSession.wahana_id);
                            return w ? <div style={{ fontSize: '0.85rem', color: '#15803d', marginTop: '0.25rem' }}>Tarif: <strong>Rp {w.topup_price.toLocaleString('id-ID')}</strong> / tiket</div> : null;
                          })()}
                        </div>
                      ) : (
                        <div style={{ marginBottom: '1.25rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>Pilih Wahana Tujuan</label>
                          <select
                            value={selectedWahanaId}
                            onChange={(e) => setSelectedWahanaId(e.target.value)}
                            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                          >
                            {wahanas.map(w => (
                              <option key={w.id} value={w.id}>{w.name} - Rp {w.topup_price?.toLocaleString('id-ID') || 0}/tiket</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>Jumlah Tiket</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <button onClick={() => setTopupQuantity(Math.max(1, topupQuantity - 1))} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '1.25rem', fontWeight: 'bold' }}>-</button>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '3rem', textAlign: 'center' }}>{topupQuantity}</span>
                        <button onClick={() => setTopupQuantity(topupQuantity + 1)} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '1.25rem', fontWeight: 'bold' }}>+</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>Pilih Paket Bundling</label>
                      {packages.length === 0 ? (
                        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #cbd5e1', color: '#64748b' }}>
                          Tidak ada paket bundling yang aktif.
                        </div>
                      ) : (
                        <select
                          value={selectedPackageId}
                          onChange={(e) => setSelectedPackageId(e.target.value)}
                          style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', marginBottom: '1rem', backgroundColor: 'white' }}
                        >
                          {packages.map(p => (
                            <option key={p.id} value={p.id}>{p.name} - Rp {p.price.toLocaleString('id-ID')}</option>
                          ))}
                        </select>
                      )}
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>*Sesuai ketentuan, Paket Bundling hanya dapat dibeli 1 paket per transaksi.</div>
                    </div>
                  )}

                  {/* Total Calculation */}
                  <div style={{ background: '#ecfdf5', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid #a7f3d0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.15rem', color: '#065f46' }}>Total Pembayaran</span>
                      <span style={{ fontWeight: '800', fontSize: '1.6rem', color: '#047857' }}>
                        Rp {calculateTopupTotal().toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {txMode === 'VOUCHER' && (
                <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    {cashierSession?.wahana_id ? (
                      <div style={{ padding: '1rem', background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: '600', marginBottom: '0.25rem' }}>Tukar Tiket Wahana:</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#166534' }}>{cashierSession.wahana_name}</div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>Pilih Tiket Wahana Member</label>
                        {memberVouchers.filter(v => v.quota > 0).length === 0 ? (
                          <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', color: '#dc2626', fontWeight: 'bold' }}>
                            Member tidak memiliki tiket wahana yang aktif.
                          </div>
                        ) : (
                          <select
                            value={selectedWahanaId}
                            onChange={(e) => setSelectedWahanaId(e.target.value)}
                            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                          >
                            {memberVouchers.filter(v => v.quota > 0).map(v => (
                              <option key={v.wahana_id} value={v.wahana_id}>
                                {v.wahanas?.name || 'Wahana'} - Tersedia: {v.quota} Tiket
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {(() => {
                      const targetWahanaId = cashierSession?.wahana_id || selectedWahanaId;
                      const boundVoucher = memberVouchers.find(v => v.wahana_id === targetWahanaId && v.quota > 0);
                      if (!boundVoucher) {
                        if (cashierSession?.wahana_id) {
                          return (
                            <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', color: '#dc2626', fontWeight: 'bold', marginBottom: '1rem' }}>
                              Member tidak memiliki tiket {cashierSession.wahana_name} yang aktif.
                            </div>
                          );
                        }
                        return null;
                      }
                      return (
                        <>
                          <div style={{ padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.75rem', color: '#15803d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '1rem' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{boundVoucher.quota} Tiket {boundVoucher.wahanas?.name || ''} Tersedia</span>
                          </div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>Jumlah Tiket yang Digunakan</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <button onClick={() => setUseVoucherQuantity(Math.max(1, useVoucherQuantity - 1))} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '1.25rem', fontWeight: 'bold' }}>-</button>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '3rem', textAlign: 'center' }}>{useVoucherQuantity}</span>
                            <button onClick={() => setUseVoucherQuantity(Math.min(boundVoucher.quota, useVoucherQuantity + 1))} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '1.25rem', fontWeight: 'bold' }}>+</button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Checkout Action */}
              {(() => {
                const targetWahanaId = cashierSession?.wahana_id || selectedWahanaId;
                const boundVoucher = memberVouchers.find(v => v.wahana_id === targetWahanaId && v.quota > 0);
                const isDisabled = isProcessing 
                  || (txMode === 'TOPUP' && topupType === 'SATUAN' && (!targetWahanaId || calculateTopupTotal() === 0))
                  || (txMode === 'TOPUP' && topupType === 'PAKET' && !selectedPackageId)
                  || (txMode === 'VOUCHER' && (!targetWahanaId || !boundVoucher || useVoucherQuantity > boundVoucher.quota));
                return (
                  <button 
                    onClick={handleCheckout}
                    disabled={isDisabled}
                    style={{ 
                      width: '100%', 
                      padding: '1rem', 
                      background: isDisabled ? '#cbd5e1' : (txMode === 'TOPUP' ? '#059669' : '#d97706'), 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '0.75rem', 
                      fontSize: '1.15rem', 
                      fontWeight: 'bold', 
                      cursor: isDisabled ? 'not-allowed' : 'pointer', 
                      transition: 'background 0.2s',
                      boxShadow: isDisabled ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}
                  >
                    {isProcessing ? 'Memproses...' : (txMode === 'VOUCHER' ? 'Gunakan Tiket' : 'Selesaikan Transaksi & Cetak Struk')}
                  </button>
                );
              })()}

            </div>
          ) : (
            <div style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '1.25rem', padding: '4rem 2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8c-5 0-6 3-6 4v14a2 2 0 0 0 2 2z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10.5 14.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/><line x1="13" x2="17.5" y1="17.5" y2="22"/></svg>
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: 'bold' }}>Menunggu Member</h3>
              <p style={{ textAlign: 'center', margin: 0, fontSize: '0.9rem', color: '#64748b' }}>Scan barcode member untuk memproses transaksi tiket {cashierSession?.wahana_name || ''}.</p>
            </div>
          )}
          
        </div>
      </main>

      {/* QRIS Dynamic Payment Modal (100% Cashless Gateway) */}
      {qrisModal && qrisData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '1.5rem', padding: '2rem', maxWidth: '420px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', textAlign: 'center', animation: 'fadeIn 0.25s ease-out' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                <span style={{ fontWeight: 'bold', color: '#065f46', fontSize: '0.9rem' }}>QRIS RESMI AVIARY PARK</span>
              </div>
              <button 
                onClick={() => { setQrisModal(false); setQrisData(null); }}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 0.25rem 0' }}>{qrisData.title}</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>Arahkan kamera HP / M-Banking ke kode QRIS di bawah</p>

            {/* QRIS Image Container */}
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', border: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ padding: '1rem', background: 'white', borderRadius: '0.75rem', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QRCodeSVG 
                  value={qrisData.qrString || qrisData.qrUrl || `https://sandbox.duitku.com/payment/${qrisData.orderId}`} 
                  size={220}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <div style={{ marginTop: '1rem', fontSize: '1.6rem', fontWeight: '800', color: '#059669' }}>
                Rp {qrisData.amount.toLocaleString('id-ID')}
              </div>
              
              {/* Live Status Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', background: '#ecfdf5', padding: '0.4rem 0.85rem', borderRadius: '2rem', border: '1px solid #a7f3d0' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', animation: 'pulse 1.5s infinite' }}></div>
                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: '600' }}>Menunggu Pembayaran (Otomatis Terdeteksi)...</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                onClick={async () => {
                  const loadingToast = toast.loading('Memeriksa status pembayaran dari Duitku...');
                  try {
                    // Panggil status inquiry real ke Payment Gateway Duitku
                    const checkRes = await fetch('/api/payment/check', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        groupId: identifiedUser.id, 
                        orderId: qrisData.orderId 
                      })
                    });
                    const checkData = await checkRes.json();
                    
                    toast.dismiss(loadingToast);

                    if (checkData.success && checkData.status === 'SUCCESS') {
                      toast.success('Pembayaran QRIS Berhasil Diverifikasi!');
                      setQrisModal(false);

                      setLastReceipt({
                        type: qrisData.type === 'PAKET' ? 'PAKET' : 'TOPUP',
                        title: qrisData.title,
                        memberName: identifiedUser.name,
                        nik: identifiedUser.nik,
                        amount: qrisData.amount,
                        qty: qrisData.qty,
                        unitPrice: qrisData.unitPrice,
                        cashier: cashierSession?.name || 'Kasir',
                        wahana: cashierSession?.wahana_name || 'Wahana',
                        time: new Date().toLocaleString('id-ID'),
                        invoice: qrisData.orderId
                      });
                      setShowReceiptModal(true);
                      setQrisData(null);
                      resetTransaction();
                    } else {
                      toast.error(checkData.message || 'Pembayaran belum diterima. Silakan scan QRIS terlebih dahulu.');
                    }
                  } catch (err) {
                    toast.dismiss(loadingToast);
                    toast.error('Gagal menghubungi gateway pembayaran');
                  }
                }}
                style={{ width: '100%', padding: '0.9rem', background: '#059669', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(5,150,105,0.3)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                Cek Status Pembayaran
              </button>

              <button 
                onClick={() => { setQrisModal(false); setQrisData(null); }}
                style={{ width: '100%', padding: '0.7rem', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Batal / Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal & Print View */}
      {showReceiptModal && lastReceipt && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', padding: '2rem', maxWidth: '380px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center' }}>
            
            {/* Printable Receipt Paper Container */}
            <div id="thermal-receipt" style={{ background: '#fdfbf7', padding: '1.5rem 1rem', borderRadius: '0.5rem', border: '1px dashed #cbd5e1', fontFamily: 'monospace', textAlign: 'left', fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.4, marginBottom: '1.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '0.05em' }}>AVIARY PARK INDONESIA</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Bintaro Creative District, Tangerang Selatan</div>
                <div style={{ borderBottom: '1px dashed #94a3b8', margin: '0.5rem 0' }}></div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>STRUK TRANSAKSI POS</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>No. Invoice:</span>
                <span style={{ fontWeight: 'bold' }}>{lastReceipt.invoice}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Waktu:</span>
                <span>{lastReceipt.time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Kasir:</span>
                <span>{lastReceipt.cashier}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Member:</span>
                <span style={{ fontWeight: 'bold' }}>{lastReceipt.memberName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>NIK:</span>
                <span>
                  {lastReceipt.nik && lastReceipt.nik.length === 16 
                    ? `${lastReceipt.nik.substring(0, 6)}******${lastReceipt.nik.substring(12)}` 
                    : lastReceipt.nik || '-'}
                </span>
              </div>

              <div style={{ borderBottom: '1px dashed #94a3b8', margin: '0.75rem 0' }}></div>

              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{lastReceipt.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{lastReceipt.qty} x {lastReceipt.unitPrice ? `Rp ${lastReceipt.unitPrice.toLocaleString('id-ID')}` : (lastReceipt.type === 'VOUCHER' ? 'Tiket Masuk' : '')}</span>
                <span style={{ fontWeight: 'bold' }}>
                  {lastReceipt.amount > 0 ? `Rp ${lastReceipt.amount.toLocaleString('id-ID')}` : 'GRATIS / TUKAR'}
                </span>
              </div>

              {lastReceipt.remainingQuota !== undefined && (
                <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '0.25rem' }}>
                  Sisa Kuota Tiket: {lastReceipt.remainingQuota}
                </div>
              )}

              <div style={{ borderBottom: '1px dashed #94a3b8', margin: '0.75rem 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold' }}>
                <span>TOTAL:</span>
                <span>Rp {lastReceipt.amount.toLocaleString('id-ID')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                <span>Metode:</span>
                <span style={{ fontWeight: 'bold', color: '#059669' }}>{lastReceipt.amount > 0 ? 'QRIS (CASHLESS)' : 'VOUCHER REDEEM'}</span>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.75rem', color: '#64748b' }}>
                <div>Terima Kasih Atas Kunjungan Anda!</div>
                <div>Simpan struk ini sebagai bukti transaksi yang sah.</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => setShowReceiptModal(false)}
                style={{ flex: 1, padding: '0.75rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Tutup
              </button>
              <button 
                onClick={() => window.print()}
                style={{ flex: 1.5, padding: '0.75rem', background: '#059669', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Cetak Struk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS for 58mm / 80mm Thermal Paper */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt, #thermal-receipt * {
            visibility: visible;
          }
          #thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 80mm;
            padding: 0;
            margin: 0;
            border: none;
            background: white;
            color: black;
          }
        }
      `}} />
    </div>
  );
}
