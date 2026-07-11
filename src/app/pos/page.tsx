"use client";

import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import jsQR from 'jsqr';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

export default function POSPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [statusMsg, setStatusMsg] = useState('Memuat model & data...');
  const [identifiedUser, setIdentifiedUser] = useState<any>(null);
  const identifiedUserRef = useRef<any>(null);
  
  const [scanMode, setScanMode] = useState<'FACE' | 'BARCODE' | 'VOUCHER'>('FACE');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [voucherInput, setVoucherInput] = useState('');
  
  const [subtotal, setSubtotal] = useState<number | ''>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [posTerminals, setPosTerminals] = useState<any[]>([]);
  const [posLocation, setPosLocation] = useState<string>('RESTO');
  const [posTerminalName, setPosTerminalName] = useState<string>('Terminal (Fallback)');
  const [rewards, setRewards] = useState<any[]>([]);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScanningRef = useRef<boolean>(false);

  // Cashier Auth State
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [cashierSession, setCashierSession] = useState<any>(null);
  const [selectedCashier, setSelectedCashier] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [termRes, cashRes] = await Promise.all([
          fetch('/api/pos/terminals'),
          fetch('/api/pos/cashiers')
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
      } catch (e) { console.error(e); }
    };
    fetchInitData();
  }, []);

  useEffect(() => {
    if (cashierSession && scanMode === 'FACE') {
      const initScanner = async () => {
        try {
          await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models')
          ]);

          setStatusMsg('Sistem POS siap. Arahkan wajah pengunjung ke kamera.');
          
          if (videoRef.current) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error(err);
          setStatusMsg('Gagal memuat sistem pemindai / kamera.');
        }
      };
      
      initScanner();

      return () => {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [cashierSession, scanMode]);

  const handleVideoPlay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      if (!cashierSession) return; // Do not scan if locked
      if (identifiedUserRef.current) return; // Pause scanning if user is identified
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
      if (isScanningRef.current) return;
      
      isScanningRef.current = true;

      try {
        const video = videoRef.current;
        let qrFound = false;

        // --- 1. QR CODE SCANNING ---
        // Create an offscreen canvas to get image data for jsQR
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            });

            if (code && code.data) {
              qrFound = true;
              console.log("QR Code detected:", code.data);
              setStatusMsg('QR Terbaca, Memproses...');
              const res = await fetch(`/api/pos/lookup?id=${code.data}`);
              if (res.ok) {
                const result = await res.json();
                if (result.data) {
                  setIdentifiedUser(result.data);
                  identifiedUserRef.current = result.data;
                  fetchRewards(result.data.id);
                  setStatusMsg('Member Ditemukan: ' + result.data.name);
                } else {
                  setStatusMsg('QR Code tidak valid atau member tidak ditemukan.');
                }
              } else {
                setStatusMsg('Gagal memverifikasi QR Code dari server.');
              }
            }
          }
        }

        // --- 2. FACE RECOGNITION (Fallback if no QR) ---
        if (!qrFound) {
          const detection = await faceapi.detectSingleFace(video)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            const descriptorArray = Array.from(detection.descriptor);
            
            const res = await fetch('/api/gate/match', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ descriptorArray })
            });
            
            if (res.ok) {
              const result = await res.json();
              if (result.data) {
                setIdentifiedUser(result.data);
                identifiedUserRef.current = result.data;
                fetchRewards(result.data.id);
                setStatusMsg('Wajah Dikenali: ' + result.data.name);
              }
            }
          }
        }
      } catch (err) {
        console.error("Scanning error", err);
      } finally {
        isScanningRef.current = false;
      }
    }, 500); // scan every 500ms for more responsive QR
  };

  const fetchRewards = async (memberId: string) => {
    try {
      const res = await fetch(`/api/visitor/loyalty?member_id=${memberId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.rewards) {
          setRewards(json.data.rewards);
        }
      }
    } catch(e) {
      console.error(e);
    }
  };

  const handleBarcodeSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeInput.trim() !== '') {
      try {
        const res = await fetch(`/api/pos/lookup?id=${barcodeInput.trim()}`);
        if (res.ok) {
          const result = await res.json();
          if (result.data) {
            setIdentifiedUser(result.data);
            identifiedUserRef.current = result.data;
            fetchRewards(result.data.id);
            setBarcodeInput('');
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
    }
  };

  const handleVoucherSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && voucherInput.trim() !== '') {
      setIsProcessing(true);
      try {
        const res = await fetch('/api/pos/voucher/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voucher_code: voucherInput.trim() })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          toast.success(`Kupon Valid & Berhasil Digunakan!\nReward: ${data.data.reward_name}`, { duration: 5000 });
          setVoucherInput('');
        } else {
          toast.error(data.message || 'Kupon tidak valid');
        }
      } catch (err) {
        console.error(err);
        toast.error('Gagal memverifikasi kupon');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const resetTransaction = () => {
    setIdentifiedUser(null);
    identifiedUserRef.current = null;
    setSubtotal('');
    setInvoiceNumber('');
    setSelectedReward(null);
    setRewards([]);
    setStatusMsg('Sistem POS siap. Arahkan wajah pengunjung ke kamera atau scan barcode.');
  };

  const calculateTotal = () => {
    let total = Number(subtotal) || 0;
    let discount = 0;
    if (selectedReward) {
      if (selectedReward.reward_type === 'VOUCHER_50K') discount = 50000;
      if (selectedReward.reward_type === 'VOUCHER_100K') discount = 100000;
    }
    return Math.max(0, total - discount);
  };

  const calculatePointsEarned = () => {
    const finalTotal = calculateTotal();
    return Math.floor(finalTotal / 10000); // using 10000 ratio
  };

  const handleCheckout = async () => {
    if (!identifiedUser || (subtotal === '' && !selectedReward)) return;
    setIsProcessing(true);
    
    try {
      const auditTerminalName = `${posTerminalName} (${cashierSession?.name})`;

      const res = await fetch('/api/pos/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: identifiedUser.id,
          subtotal: Number(subtotal) || 0,
          reward_id: selectedReward ? selectedReward.id : null,
          location: posLocation,
          terminal_name: auditTerminalName,
          invoice_number: invoiceNumber
        })
      });
      
      const result = await res.json();
      if (result.success) {
        toast.success(`Transaksi Berhasil!\nDiskon: ${selectedReward ? selectedReward.name : '-'}\nPoin Didapat: +${result.data.points_earned} Poin`);
        resetTransaction();
      } else {
        toast.error('Gagal memproses transaksi: ' + result.error);
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
        setCashierSession(data.cashier);
        setPinInput('');
        toast.success(`Selamat bekerja, ${data.cashier.name}!`);
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
              <option key={c.id} value={c.id}>{c.name}</option>
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
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <Toaster position="top-center" reverseOrder={false} />
      <header style={{ background: '#022c22', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '40px' }} />
          <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 'bold' }}>POS Kasir & Penukaran Poin</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }}></div>
            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{cashierSession.name}</span>
          </div>
          <button 
            onClick={() => setCashierSession(null)}
            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Kunci POS (Lock)
          </button>
          <Link href="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '500', marginLeft: '1rem' }}>Dasbor</Link>
        </div>
      </header>

      <main style={{ padding: '2rem', flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Scanner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Terminal Location (Always Visible) */}
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>Pilih Lokasi Kasir</h2>
            <select 
              value={`${posLocation}|${posTerminalName}`} 
              onChange={e => {
                const [cat, name] = e.target.value.split('|');
                setPosLocation(cat);
                setPosTerminalName(name);
              }}
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc', fontWeight: '600', color: '#0f172a' }}
            >
              {posTerminals.length > 0 ? posTerminals.map((t: any) => (
                <option key={t.id} value={`${t.category}|${t.name}`}>{t.name}</option>
              )) : (
                <>
                  <option value="RESTO|Restoran & Cafe (F&B)">🍔 Restoran & Cafe (F&B)</option>
                  <option value="SOUVENIR|Toko Merchandise (Souvenir)">🎁 Toko Merchandise (Souvenir)</option>
                  <option value="WAHANA|Wahana Bermain (Wahana)">🎢 Wahana Bermain (Wahana)</option>
                </>
              )}
            </select>
          </div>

          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>Identifikasi Member</h2>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button onClick={() => setScanMode('FACE')} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontWeight: 'bold', border: '1px solid #cbd5e1', background: scanMode === 'FACE' ? '#0f172a' : 'white', color: scanMode === 'FACE' ? 'white' : '#64748b', cursor: 'pointer', fontSize: '0.875rem' }}>Scan Wajah</button>
              <button onClick={() => setScanMode('BARCODE')} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontWeight: 'bold', border: '1px solid #cbd5e1', background: scanMode === 'BARCODE' ? '#0f172a' : 'white', color: scanMode === 'BARCODE' ? 'white' : '#64748b', cursor: 'pointer', fontSize: '0.875rem' }}>Scan ID / Gelang</button>
              <button onClick={() => setScanMode('VOUCHER')} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontWeight: 'bold', border: '1px solid #059669', background: scanMode === 'VOUCHER' ? '#059669' : '#ecfdf5', color: scanMode === 'VOUCHER' ? 'white' : '#059669', cursor: 'pointer', fontSize: '0.875rem' }}>Scan Voucher</button>
            </div>

            {scanMode === 'FACE' ? (
              <div style={{ position: 'relative', borderRadius: '1rem', overflow: 'hidden', backgroundColor: 'black', aspectRatio: '4/3', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline
                  onPlay={handleVideoPlay}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', top: '1rem', left: '1rem', right: '1rem', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', backdropFilter: 'blur(4px)', textAlign: 'center' }}>
                  {statusMsg}
                </div>
              </div>
            ) : scanMode === 'BARCODE' ? (
              <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '1rem', padding: '3rem 1.5rem', textAlign: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1" style={{ marginBottom: '1rem' }}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>Identifikasi Member (Scanner Fisik)</h3>
                <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.875rem' }}>Arahkan scanner ke QR Code E-Card pelanggan atau ketik Member ID lalu tekan Enter.</p>
                <input 
                  autoFocus
                  type="text" 
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeSubmit}
                  placeholder="Scan ID disini..."
                  style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', textAlign: 'center' }}
                />
              </div>
            ) : (
              <div style={{ background: '#ecfdf5', border: '2px dashed #059669', borderRadius: '1rem', padding: '3rem 1.5rem', textAlign: 'center' }}>
                <div style={{ background: 'white', display: 'inline-flex', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#065f46' }}>Validasi Voucher Reward</h3>
                <p style={{ margin: '0 0 1.5rem 0', color: '#047857', fontSize: '0.875rem' }}>Arahkan scanner ke QR Code Voucher pengunjung atau ketik Kode Voucher (8 digit) secara manual lalu tekan Enter.</p>
                <input 
                  autoFocus
                  type="text" 
                  value={voucherInput}
                  onChange={e => setVoucherInput(e.target.value.toUpperCase())}
                  onKeyDown={handleVoucherSubmit}
                  placeholder="Masukkan 8 digit Kode Voucher..."
                  maxLength={8}
                  style={{ width: '100%', padding: '1rem', fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '0.1em', borderRadius: '0.5rem', border: '1px solid #34d399', textAlign: 'center', color: '#065f46' }}
                />
              </div>
            )}
            {identifiedUser && (
              <button 
                onClick={resetTransaction}
                style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Scan Ulang
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Checkout Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {identifiedUser ? (
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              
              {/* Member Profile & Points */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ width: '50px', height: '50px', background: '#10b981', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {identifiedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>{identifiedUser.name}</h3>
                  <p style={{ margin: 0, color: '#059669', fontWeight: 'bold' }}>Saldo Poin: {identifiedUser.points_balance || 0}</p>
                </div>
              </div>

              {/* Input Belanja */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>No. Struk / Invoice (Opsional)</label>
                <input 
                  type="text" 
                  value={invoiceNumber} 
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="Contoh: FB-001"
                  style={{ width: '100%', padding: '1rem', fontSize: '1.25rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', marginBottom: '1rem' }}
                />

                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Total Nominal Transaksi (Rp)</label>
                <input 
                  type="number" 
                  value={subtotal} 
                  onChange={e => setSubtotal(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Contoh: 150000"
                  style={{ width: '100%', padding: '1rem', fontSize: '1.25rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                />
              </div>

              {/* Promo & Rewards */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Gunakan Poin untuk Diskon</label>
                {rewards.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Tidak ada promo yang tersedia.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div 
                      onClick={() => setSelectedReward(null)}
                      style={{ padding: '0.75rem 1rem', border: '1px solid', borderColor: selectedReward === null ? '#10b981' : '#e2e8f0', background: selectedReward === null ? '#f0fdf4' : 'white', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                    >
                      <span style={{ fontWeight: '500' }}>Tanpa Diskon</span>
                    </div>
                    {rewards.map(r => {
                      const isEligible = (identifiedUser.points_balance || 0) >= r.points_required;
                      return (
                        <div 
                          key={r.id}
                          onClick={() => { if(isEligible) setSelectedReward(r) }}
                          style={{ 
                            padding: '0.75rem 1rem', 
                            border: '1px solid', 
                            borderColor: selectedReward?.id === r.id ? '#10b981' : '#e2e8f0', 
                            background: selectedReward?.id === r.id ? '#f0fdf4' : 'white', 
                            borderRadius: '0.5rem', 
                            cursor: isEligible ? 'pointer' : 'not-allowed', 
                            opacity: isEligible ? 1 : 0.5,
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: '500', display: 'block' }}>{r.name}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Kurangi {r.points_required} Poin</span>
                          </div>
                          {!isEligible && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Poin Kurang</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Total Calculation */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Subtotal</span>
                  <span>Rp {Number(subtotal || 0).toLocaleString('id-ID')}</span>
                </div>
                {selectedReward && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#ef4444' }}>
                    <span>Diskon ({selectedReward.name})</span>
                    <span>- {selectedReward.points_required} Poin</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>Total Bayar</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#0f172a' }}>
                    Rp {calculateTotal().toLocaleString('id-ID')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: '#059669', fontSize: '0.875rem' }}>
                  <span>Poin Didapat dari Transaksi Ini</span>
                  <span style={{ fontWeight: 'bold' }}>+{calculatePointsEarned()} Poin</span>
                </div>
              </div>

              {/* Checkout Action */}
              <button 
                onClick={handleCheckout}
                disabled={((subtotal === '' || subtotal === 0) && !selectedReward) || isProcessing}
                style={{ width: '100%', padding: '1rem', background: (((subtotal === '' || subtotal === 0) && !selectedReward) || isProcessing) ? '#94a3b8' : '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1.25rem', fontWeight: 'bold', cursor: (((subtotal === '' || subtotal === 0) && !selectedReward) || isProcessing) ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
              >
                {isProcessing ? 'Memproses...' : 'Selesaikan Transaksi & Cetak Struk'}
              </button>

            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '1rem', padding: '3rem 2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '1rem', opacity: 0.5 }}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8c-5 0-6 3-6 4v14a2 2 0 0 0 2 2z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10.5 14.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/><line x1="13" x2="17.5" y1="17.5" y2="22"/></svg>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>Menunggu Member</h3>
              <p style={{ textAlign: 'center', margin: 0 }}>Harap scan wajah pelanggan terlebih dahulu untuk memproses pesanan dan poin.</p>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}
