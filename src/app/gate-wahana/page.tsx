"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

interface Wahana {
  id: string;
  name: string;
  category: string;
}

export default function GateWahanaScanner() {
  const [wahanas, setWahanas] = useState<Wahana[]>([]);
  const [selectedWahanaId, setSelectedWahanaId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(true);
  const [scanResult, setScanResult] = useState<{
    status: 'SUCCESS' | 'ERROR' | 'IDLE';
    memberName?: string;
    wahanaName?: string;
    remainingQuota?: number;
    message?: string;
  }>({ status: 'IDLE' });

  const [todayScannedCount, setTodayScannedCount] = useState<number>(0);
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('Memulai kamera...');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestAnimationRef = useRef<number | null>(null);
  const isCooldownRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);

  // 0. Listen for PWA Install Prompt
  useEffect(() => {
    // Cek apakah sudah running sebagai standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      toast('Untuk menginstall di HP:\nBuka menu browser (titik 3) lalu pilih "Tambahkan ke Layar Utama" / "Install App"', { icon: '📲', duration: 4000 });
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      toast.success('Aplikasi Scanner berhasil diinstall ke HP!');
    }
  };

  // 1. Ambil daftar wahana aktif
  useEffect(() => {
    let isMounted = true;
    const fetchWahanas = async () => {
      try {
        let res = await fetch('/api/gate/wahanas');
        if (!res.ok) {
          res = await fetch('/api/pos/wahanas');
        }
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data?.data || []);
          const active = list.filter((w: any) => w.is_active !== false);
          
          if (isMounted && active.length > 0) {
            setWahanas(active);
            const savedWahana = localStorage.getItem('gate_wahana_id');
            if (savedWahana && active.some((w: any) => w.id === savedWahana)) {
              setSelectedWahanaId(savedWahana);
            } else {
              setSelectedWahanaId(active[0].id);
              localStorage.setItem('gate_wahana_id', active[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load wahanas', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchWahanas();
    return () => { isMounted = false; };
  }, []);

  const handleWahanaChange = (id: string) => {
    setSelectedWahanaId(id);
    localStorage.setItem('gate_wahana_id', id);
    setScanResult({ status: 'IDLE' });
  };

  // 2. Play Audio Feedback
  const playSound = (type: 'success' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(160, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn('Audio Context not available', e);
    }
  };

  // 3. Proses Redeem Kuota Tiket Wahana
  const processRedeemTicket = useCallback(async (scannedIdentifier: string) => {
    if (!selectedWahanaId || isProcessing || isCooldownRef.current) return;
    
    isCooldownRef.current = true;
    setIsProcessing(true);

    try {
      // Step A: Cari Member berdasarkan identifier (ID/NIK/Phone/QR Code)
      const cleanId = scannedIdentifier.trim();
      const lookupRes = await fetch(`/api/pos/lookup?id=${encodeURIComponent(cleanId)}`);
      
      if (!lookupRes.ok) {
        playSound('error');
        setScanResult({
          status: 'ERROR',
          message: 'Member tidak ditemukan atau barcode tidak valid.'
        });
        setTimeout(() => { isCooldownRef.current = false; }, 2500);
        return;
      }

      const lookupData = await lookupRes.json();
      const member = lookupData.data;

      if (!member || !member.id) {
        playSound('error');
        setScanResult({
          status: 'ERROR',
          message: 'Data anggota tidak ditemukan.'
        });
        setTimeout(() => { isCooldownRef.current = false; }, 2500);
        return;
      }

      // Step B: Potong 1 Kuota Voucher Wahana
      const activeWahana = wahanas.find(w => w.id === selectedWahanaId);
      const redeemRes = await fetch('/api/pos/use-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          wahana_id: selectedWahanaId,
          quantity: 1,
          terminal_name: `Gate Wahana (${activeWahana?.name || 'Mobile'})`
        })
      });

      const redeemData = await redeemRes.json();

      if (redeemData.success) {
        playSound('success');
        setTodayScannedCount(c => c + 1);
        setScanResult({
          status: 'SUCCESS',
          memberName: member.name,
          wahanaName: activeWahana?.name || 'Wahana',
          remainingQuota: redeemData.data?.remaining_quota ?? 0,
          message: 'Tiket berhasil divalidasi! Selamat menikmati wahana.'
        });
      } else {
        playSound('error');
        setScanResult({
          status: 'ERROR',
          memberName: member.name,
          wahanaName: activeWahana?.name,
          message: redeemData.error || 'Kuota tiket habis atau belum memiliki voucher wahana ini.'
        });
      }
    } catch (err: any) {
      console.error('Scan redeem error:', err);
      playSound('error');
      setScanResult({
        status: 'ERROR',
        message: 'Koneksi error atau sistem sedang sibuk.'
      });
    } finally {
      setIsProcessing(false);
      // Cooldown 2.5 detik sebelum scan berikutnya agar tidak multi-trigger
      setTimeout(() => {
        isCooldownRef.current = false;
      }, 2500);
    }
  }, [selectedWahanaId, wahanas, isProcessing]);

  // 4. Inisialisasi Kamera & Scanner jsQR
  useEffect(() => {
    let stream: MediaStream | null = null;
    let detector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a', 'data_matrix']
        });
      } catch (e) {}
    }

    const scanQRCode = async () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        // 1. PRIORITAS UTAMA: Hardware-Accelerated BarcodeDetector (0.01 detik di HP!)
        if (detector && !isCooldownRef.current) {
          try {
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const raw = barcodes[0].rawValue;
              setDebugInfo(`🎯 Terbaca: ${raw.substring(0, 20)}...`);
              processRedeemTicket(raw);
              requestAnimationRef.current = requestAnimationFrame(scanQRCode);
              return;
            }
          } catch (e) {}
        }

        // 2. FALLBACK CEPAT: jsQR dengan Frame Ringan (640px)
        if (canvas && video.videoWidth > 0 && !isCooldownRef.current) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const targetW = 640;
            const targetH = Math.floor((video.videoHeight / video.videoWidth) * 640);
            if (canvas.width !== targetW) canvas.width = targetW;
            if (canvas.height !== targetH) canvas.height = targetH;
            
            ctx.drawImage(video, 0, 0, targetW, targetH);
            const imgData = ctx.getImageData(0, 0, targetW, targetH);
            
            const code = jsQR(imgData.data, targetW, targetH, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              setDebugInfo(`🎯 Terbaca: ${code.data.substring(0, 20)}...`);
              processRedeemTicket(code.data);
            }
          }
        }
      }
      requestAnimationRef.current = requestAnimationFrame(scanQRCode);
    };

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: 'environment' }, 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('autoplay', 'true');
          videoRef.current.muted = true;
          
          await videoRef.current.play().catch(() => {});
          requestAnimationRef.current = requestAnimationFrame(scanQRCode);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Camera access error:', err);
          toast.error('Gagal mengakses kamera HP. Izinkan akses kamera pada browser.');
        }
      }
    };

    if (isScanning) {
      startCamera();
    }

    return () => {
      if (requestAnimationRef.current) cancelAnimationFrame(requestAnimationRef.current);
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isScanning, processRedeemTicket]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <Toaster position="top-center" />
      
      {/* Top Header Bar */}
      <header style={{ padding: '1rem', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🎢</span> GATE WAHANA SCANNER
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Petugas Operasional Aviary Park</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {!isAppInstalled && (
            <button
              onClick={handleInstallApp}
              style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '0.45rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)' }}
            >
              <span>📲</span> Install App
            </button>
          )}

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Total Hari Ini</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#38bdf8' }}>{todayScannedCount} <span style={{ fontSize: '0.75rem' }}>Pax</span></div>
          </div>
          
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/system-login';
            }}
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.45rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        
        {/* Selector Wahana */}
        <div style={{ backgroundColor: '#1e293b', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid #334155' }}>
          <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600', marginBottom: '0.35rem', display: 'block' }}>
            Posisi Wahana Yang Dijaga:
          </label>
          <select 
            value={selectedWahanaId} 
            onChange={(e) => handleWahanaChange(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #475569', borderRadius: '0.5rem', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', outline: 'none' }}
          >
            {wahanas.length === 0 ? (
              <option value="" style={{ backgroundColor: '#0f172a', color: '#94a3b8' }}>Memuat daftar wahana...</option>
            ) : (
              wahanas.map(w => (
                <option key={w.id} value={w.id} style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: '0.5rem' }}>
                  {w.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Video Viewport & Scanner View */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', backgroundColor: '#000', borderRadius: '1rem', overflow: 'hidden', border: scanResult.status === 'SUCCESS' ? '4px solid #10b981' : (scanResult.status === 'ERROR' ? '4px solid #ef4444' : '2px solid #334155') }}>
          <video 
            ref={videoRef} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Live Debug Info Badge */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 'bold' }}>
              📟 {debugInfo}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold' }}>
              ● LIVE
            </span>
          </div>

          {/* Scanner Reticle Overlay */}
          <div style={{ position: 'absolute', top: '15%', left: '15%', width: '70%', height: '70%', border: '2px dashed rgba(255,255,255,0.7)', borderRadius: '1rem', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', height: '2px', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981', position: 'absolute', animation: 'scanLine 2s infinite linear' }} />
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <div style={{ width: '36px', height: '36px', border: '4px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>Memvalidasi Tiket...</span>
            </div>
          )}
        </div>

        {/* Dynamic Scan Result Modal/Card */}
        {scanResult.status !== 'IDLE' && (
          <div style={{ 
            backgroundColor: scanResult.status === 'SUCCESS' ? '#064e3b' : '#7f1d1d', 
            border: `2px solid ${scanResult.status === 'SUCCESS' ? '#10b981' : '#ef4444'}`,
            padding: '1.25rem', 
            borderRadius: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>
              {scanResult.status === 'SUCCESS' ? '✅' : '❌'}
            </div>
            
            <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: scanResult.status === 'SUCCESS' ? '#34d399' : '#fca5a5', margin: '0 0 0.5rem 0' }}>
              {scanResult.status === 'SUCCESS' ? 'TIKET VALID / SILAKAN MASUK' : 'TIKET TIDAK VALID / DITOLAK'}
            </h2>

            {scanResult.memberName && (
              <p style={{ fontSize: '1rem', fontWeight: '700', margin: '0.2rem 0', color: '#fff' }}>
                Pengunjung: <span style={{ textDecoration: 'underline' }}>{scanResult.memberName}</span>
              </p>
            )}

            {scanResult.status === 'SUCCESS' && (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '0.5rem', marginTop: '0.5rem', display: 'inline-block' }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Sisa Kuota Tiket: </span>
                <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#fbbf24' }}>{scanResult.remainingQuota} Tiket</span>
              </div>
            )}

            <p style={{ fontSize: '0.85rem', color: '#e2e8f0', margin: '0.5rem 0 0 0' }}>
              {scanResult.message}
            </p>
          </div>
        )}

        {/* Manual Input Fallback */}
        <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #334155' }}>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.5rem 0' }}>Kamera bermasalah? Masukkan ID / NIK Member manual:</p>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) processRedeemTicket(manualCode.trim());
            }} 
            style={{ display: 'flex', gap: '0.5rem' }}
          >
            <input 
              type="text" 
              placeholder="Ketik NIK / ID Member..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              style={{ flex: 1, padding: '0.65rem 0.85rem', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '0.5rem', fontSize: '0.9rem' }}
            />
            <button 
              type="submit"
              disabled={isProcessing}
              style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '0.65rem 1rem', borderRadius: '0.5rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Potong
            </button>
          </form>
        </div>

        {/* Footer Navigation */}
        <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: '1rem' }}>
          <Link href="/admin" style={{ color: '#64748b', fontSize: '0.8rem', textDecoration: 'none' }}>
            ← Kembali ke Panel Admin
          </Link>
        </div>
      </main>

      <style jsx global>{`
        @keyframes scanLine {
          0% { top: 10%; opacity: 0.8; }
          50% { top: 90%; opacity: 1; }
          100% { top: 10%; opacity: 0.8; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

