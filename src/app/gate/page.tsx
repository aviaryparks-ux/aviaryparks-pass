"use client";

import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

export default function GateScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [statusMsg, setStatusMsg] = useState('Memuat model & data pengunjung...');
  const [gateStatus, setGateStatus] = useState<'idle' | 'success' | 'denied' | 'loading'>('loading');
  const [identifiedUser, setIdentifiedUser] = useState<any>(null);
  const [identifiedFamily, setIdentifiedFamily] = useState<any[]>([]);
  
  const [viewModeState, setViewModeState] = useState<'SCANNING' | 'DETAIL'>('SCANNING');
  const viewModeRef = useRef<'SCANNING' | 'DETAIL'>('SCANNING');
  const setViewMode = (mode: 'SCANNING' | 'DETAIL') => {
    viewModeRef.current = mode;
    setViewModeState(mode);
  };
  const [cooldown, setCooldown] = useState(0);
  const [isCooldownPaused, setIsCooldownPaused] = useState(false);
  
  // State untuk scan gelang Calisto instan
  const [wristbandCode, setWristbandCode] = useState('');
  const [isLinkingWristband, setIsLinkingWristband] = useState(false);
  const [wristbandLinkedSuccess, setWristbandLinkedSuccess] = useState(false);
  const wristbandInputRef = useRef<HTMLInputElement | null>(null);

  const [packages, setPackages] = useState<any[]>([]);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const membersRef = useRef<any[]>([]);
  const faceMatcherRef = useRef<faceapi.FaceMatcher | null>(null);
  const lastScansRef = useRef<Record<string, number>>({}); 
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScanningRef = useRef<boolean>(false);

  const returnToGate = () => {
    setViewMode('SCANNING');
    setGateStatus('idle');
    setIdentifiedUser(null);
    setIdentifiedFamily([]);
    setWristbandCode('');
    setWristbandLinkedSuccess(false);
    setStatusMsg('Sistem siap. Menunggu pengunjung...');
  };

  const handleLinkWristband = async (codeToLink: string) => {
    if (!identifiedUser?.id || !codeToLink.trim() || isLinkingWristband) return;
    setIsLinkingWristband(true);
    try {
      const res = await fetch('/api/gate/visits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: identifiedUser.id,
          card_uid: codeToLink.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWristbandLinkedSuccess(true);
        setCooldown(2);
        setIdentifiedUser({ ...identifiedUser, card_uid: codeToLink.trim() });
        toast.success('Gelang Calisto Berhasil Dikaitkan!', { icon: '🎟️', duration: 2500 });
        
        // Play success audio
        if ('speechSynthesis' in window) {
          const speakMsg = new SpeechSynthesisUtterance('Gelang berhasil dikaitkan.');
          speakMsg.lang = 'id-ID';
          window.speechSynthesis.speak(speakMsg);
        }
      } else {
        toast.error(data?.error || 'Gagal mengaitkan gelang');
      }
    } catch (e) {
      console.warn('Failed to link wristband', e);
      toast.error('Gagal menghubungkan ke server');
    } finally {
      setIsLinkingWristband(false);
    }
  };

  useEffect(() => {
    if (viewModeState === 'DETAIL') {
      // Fokuskan input scanner gelang Calisto secara otomatis saat popup muncul
      setTimeout(() => {
        if (wristbandInputRef.current) {
          wristbandInputRef.current.focus();
        }
      }, 300);

      // Jika gelang SUDAH berhasil dikaitkan, jalankan hitung mundur 3 detik untuk kembali ke scanner
      if (wristbandLinkedSuccess) {
        if (cooldown > 0 && !isCooldownPaused) {
          cooldownTimerRef.current = setTimeout(() => {
            setCooldown(prev => prev - 1);
          }, 1000);
        } else if (cooldown === 0 && !isCooldownPaused) {
          returnToGate();
        }
      }
    }
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, [viewModeState, cooldown, isCooldownPaused, wristbandLinkedSuccess]);

  useEffect(() => {
    const initScanner = async () => {
      try {
        // 1. Muat Model AI
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);

        // 2. Ambil data paket untuk keperluan tampilan
        const pFetch = await fetch('/api/public/packages');
        const packagesRes = await pFetch.json();
        
        if (packagesRes.data) {
          setPackages(packagesRes.data);
        }

        setStatusMsg('Sistem siap. Menunggu pengunjung...');
        setGateStatus('idle');

        setStatusMsg('Sistem siap. Menunggu pengunjung...');
        setGateStatus('idle');
        
        // 4. Aktifkan Kamera
        startCamera();

      } catch (err) {
        console.error(err);
        setStatusMsg('Gagal memuat sistem pemindai.');
        setGateStatus('denied');
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
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatusMsg('Akses kamera ditolak. Harap izinkan akses kamera di pengaturan browser Anda (biasanya ikon gembok di sebelah URL bar), lalu muat ulang halaman ini.');
      } else if (err.name === 'NotFoundError') {
        setStatusMsg('Kamera tidak terdeteksi di perangkat ini. Pastikan Anda memiliki kamera yang berfungsi.');
      } else {
        setStatusMsg('Terjadi kesalahan saat mengakses kamera: ' + err.message);
      }
      setGateStatus('denied');
    }
  };

  const handleVideoPlay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Scan cepat setiap 200ms (5 FPS) agar gate responsif instan tanpa delay
    intervalRef.current = setInterval(async () => {
      if (viewModeRef.current === 'DETAIL') return; // Pause scanning if in detail mode
      if (!videoRef.current) return;
      if (videoRef.current.paused || videoRef.current.ended) return;
      
      // Mencegah penumpukan scan jika request sebelumnya masih berjalan
      if (isScanningRef.current) return;
      
      isScanningRef.current = true;

      try {
        // minConfidence 0.85 (High Precision) agar wajah yang terhalang tangan / tidak jelas tidak terdeteksi
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.85 })
        )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection && detection.detection.score >= 0.85) {
          // Validasi Biometrik Ketat: Pastikan Mata Terbuka & Tidak Tertutup Solasi/Benda (Eye Aspect Ratio / EAR Check)
          const landmarks = detection.landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          const nose = landmarks.getNose();
          const mouth = landmarks.getMouth();

          if (!leftEye?.length || !rightEye?.length || !nose?.length || !mouth?.length) {
            return;
          }

          // Hitung Eye Aspect Ratio (Keterbukaan Mata)
          // Mata normal memiliki perbandingan tinggi/lebar > 0.18. Jika ditutup solasi/merem, nilainya < 0.15
          const getEyeOpenness = (eye: { x: number; y: number }[]) => {
            if (eye.length < 6) return 0;
            const height1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
            const height2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
            const width = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
            return width > 0 ? (height1 + height2) / (2.0 * width) : 0;
          };

          const leftEAR = getEyeOpenness(leftEye);
          const rightEAR = getEyeOpenness(rightEye);

          // Jika salah satu atau kedua mata tertutup solasi / terhalang (EAR < 0.16), tolak scan
          if (leftEAR < 0.16 || rightEAR < 0.16) {
            return;
          }
          // Visual Overlay: Tampilkan HUD Box Fokus Bersih (bukan jaring-jaring titik pink/cyan)
          if (canvasRef.current && videoRef.current) {
            const displaySize = { width: videoRef.current.offsetWidth, height: videoRef.current.offsetHeight };
            faceapi.matchDimensions(canvasRef.current, displaySize);
            const resizedDetections = faceapi.resizeResults(detection, displaySize);
            
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              
              // Gambar Kotak Fokus Biometrik Halus & Elegan di sekeliling wajah
              const box = resizedDetections.detection.box;
              const pad = 12;
              const x = Math.max(0, box.x - pad);
              const y = Math.max(0, box.y - pad);
              const w = box.width + (pad * 2);
              const h = box.height + (pad * 2);
              const cornerLength = Math.min(28, w / 4);

              ctx.lineWidth = 3;
              ctx.strokeStyle = '#10b981'; // Emerald Green Theme
              ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
              ctx.shadowBlur = 8;

              // Corner Top-Left
              ctx.beginPath();
              ctx.moveTo(x, y + cornerLength);
              ctx.lineTo(x, y);
              ctx.lineTo(x + cornerLength, y);
              ctx.stroke();

              // Corner Top-Right
              ctx.beginPath();
              ctx.moveTo(x + w - cornerLength, y);
              ctx.lineTo(x + w, y);
              ctx.lineTo(x + w, y + cornerLength);
              ctx.stroke();

              // Corner Bottom-Left
              ctx.beginPath();
              ctx.moveTo(x, y + h - cornerLength);
              ctx.lineTo(x, y + h);
              ctx.lineTo(x + cornerLength, y + h);
              ctx.stroke();

              // Corner Bottom-Right
              ctx.beginPath();
              ctx.moveTo(x + w - cornerLength, y + h);
              ctx.lineTo(x + w, y + h);
              ctx.lineTo(x + w, y + h - cornerLength);
              ctx.stroke();

              // Glow Center Tag
              ctx.shadowBlur = 0;
              ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
              ctx.font = 'bold 11px system-ui, sans-serif';
              ctx.fillText('AI BIOMETRIC MATCH', x + 6, y - 6);
            }
          }

          const descriptorArray = Array.from(detection.descriptor);
          
          const res = await fetch('/api/gate/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descriptorArray })
          });
          
          if (res.ok) {
            const result = await res.json();
            if (result.data) {
              handleMatch(result.data, result.family || []);
            } else {
              handleUnknown();
            }
          }
        } else {
          // Clear canvas if no face detected
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      } catch (err) {
        console.error("Scanning error", err);
      } finally {
        isScanningRef.current = false;
      }
    }, 200);
  };

  const speakWelcome = (name: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(`Selamat datang di Aviary Park Indonesia, ${name.split(' ')[0]}`);
      msg.lang = 'id-ID';
      msg.rate = 0.95;
      msg.pitch = 1.1;
      window.speechSynthesis.speak(msg);
    }
  };

  const handleMatch = async (member: any, family: any[]) => {
    // Cek Status Keaktifan
    const isValidStatus = member.status === 'ACTIVE' || member.status?.toLowerCase() === 'primary' || member.role?.toUpperCase() === 'PRIMARY';
    if (!isValidStatus) {
      setStatusMsg(`Akses Ditolak: Tiket ${member.name} belum dibayar / kadaluarsa.`);
      setGateStatus('denied');
      setIdentifiedUser(member);
      return;
    }

    // Cek Spam (Cooldown 30 detik agar 1 orang yang berdiri di depan kamera tidak tercatat ganda)
    const now = Date.now();
    const lastScan = lastScansRef.current[member.id] || 0;
    if (now - lastScan < 30000) {
      // Sudah terekam beberapa detik lalu, tetap beri salam hijau tanpa menduplikasi log
      setStatusMsg(`Akses Diberikan: Selamat bersenang-senang, ${member.name}!`);
      setGateStatus('success');
      setIdentifiedUser(member);
      return;
    }

    // Rekam Kunjungan Baru
    lastScansRef.current[member.id] = now;
    setStatusMsg(`Akses Diberikan: Selamat bersenang-senang, ${member.name}!`);
    setGateStatus('success');
    setIdentifiedUser(member);
    
    // Putar Suara Selamat Datang
    speakWelcome(member.name);
    setIdentifiedFamily(family);

    setViewMode('DETAIL');
    setCooldown(3);
    setIsCooldownPaused(false);

    // Panggil API Backend (Validasi Kuota 1x Per Hari & Simpan Kunjungan)
    try {
      const res = await fetch('/api/gate/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          location: 'Gerbang Utama'
        })
      });

      const resJson = await res.json().catch(() => null);

      if (!res.ok) {
        if (resJson?.already_checked_in) {
          // Member sudah masuk hari ini
          setStatusMsg(`Akses Ditolak: ${member.name} sudah masuk hari ini (Kuota 1x/hari).`);
          setGateStatus('denied');
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const deniedMsg = new SpeechSynthesisUtterance(`Maaf ${member.name}, tiket Annual Pass Anda sudah digunakan hari ini.`);
            deniedMsg.lang = 'id-ID';
            window.speechSynthesis.speak(deniedMsg);
          }
          return;
        }
        console.warn("Failed to record visit in backend:", resJson?.error || res.statusText);
      }
    } catch (err) {
      console.warn("Error calling visits API:", err);
    }
  };

  const handleUnknown = () => {
    setStatusMsg('Wajah Tidak Dikenali');
    setGateStatus('denied');
    setIdentifiedUser(null);
    setIdentifiedFamily([]);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('system_username');
      localStorage.removeItem('system_role');
      window.location.href = '/system-login';
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  // Pengaturan Warna UI Dinamis
  let borderColor = '#94a3b8';
  let bgColor = '#f8fafc';
  let textColor = '#334155';
  let icon = null;
  if (gateStatus === 'success') {
    borderColor = '#10b981'; // Green
    bgColor = '#dcfce7';
    textColor = '#16a34a';
    icon = (
      <svg className="animated-check" width="32" height="32" viewBox="0 0 52 52">
        <circle className="check-circle" cx="26" cy="26" r="25" fill="none" stroke="currentColor" strokeWidth="4" />
        <path className="check-path" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" d="M14 27l7 7 16-16" />
      </svg>
    );
  } else if (gateStatus === 'denied') {
    borderColor = '#ef4444'; // Red
    bgColor = '#fef2f2';
    textColor = '#dc2626';
    icon = <span style={{ fontSize: '1.8rem' }}>❌</span>;
  } else if (gateStatus === 'loading') {
    icon = <span style={{ fontSize: '1.8rem' }}>⚙️</span>;
  } else {
    icon = <span style={{ fontSize: '1.8rem' }}>👁️</span>;
  }

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100vh', overflow: 'hidden',
      background: `url('/hero-new.jpg') center center / cover no-repeat`,
      position: 'relative'
    }}>
      <Toaster position="top-center" />
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scanline {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes pulseBorder {
          0% { border-color: rgba(16, 185, 129, 0.4); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50% { border-color: rgba(16, 185, 129, 1); box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
          100% { border-color: rgba(16, 185, 129, 0.4); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes strokeDraw {
          100% { stroke-dashoffset: 0; }
        }
        .animated-check .check-circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          animation: strokeDraw 0.5s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
        .animated-check .check-path {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: strokeDraw 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.5s forwards;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpBounce { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes float { 0% { transform: translateY(0px); box-shadow: 0 15px 35px -5px rgba(6, 78, 59, 0.4); } 50% { transform: translateY(-8px); box-shadow: 0 25px 40px -5px rgba(6, 78, 59, 0.5); } 100% { transform: translateY(0px); box-shadow: 0 15px 35px -5px rgba(6, 78, 59, 0.4); } }
      `}} />
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '1.5rem 3rem', zIndex: 10 }}>
        
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
          <img src="/logo.png" alt="Aviary Park Indonesia" style={{ height: '60px', width: 'auto' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '13rem', gap: '1rem' }}>
          <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.4rem 1.2rem', borderRadius: '2rem', fontWeight: 'bold', fontSize: '1rem' }}>
            LOKET
          </div>
          <button 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.4rem 1.2rem', borderRadius: '2rem', fontWeight: 'bold', fontSize: '1rem', border: 'none', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>


      </div>

      {/* Main Scanner Container */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%', 
        maxWidth: '750px', 
        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
        borderRadius: '1.5rem', 
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(10px)',
        padding: '1.5rem',
        marginTop: '0.5rem',
        marginBottom: '1rem',
        flex: 1,
        zIndex: 10
      }}>
        
        {/* Status Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: bgColor, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, border: `2px solid ${borderColor}40` }}>
            {icon}
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: textColor, margin: 0 }}>
              {statusMsg}
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Posisikan wajah Anda di dalam kotak
            </p>
          </div>
        </div>

        {/* Detail ID Card & Keluarga dihilangkan dari sini, dipindah ke overlay penuh */}

      {/* Detail Overlay Penuh */}
      {viewModeState === 'DETAIL' && identifiedUser && (
        <div 
          style={{ 
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(248, 250, 252, 0.95)', zIndex: 100,
            backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '2rem 1rem', overflowY: 'auto',
            animation: 'fadeIn 0.4s ease-out'
          }}
          onMouseDown={() => setIsCooldownPaused(true)}
          onMouseUp={() => setIsCooldownPaused(false)}
          onMouseLeave={() => setIsCooldownPaused(false)}
          onTouchStart={() => setIsCooldownPaused(true)}
          onTouchEnd={() => setIsCooldownPaused(false)}
        >
          {/* Header internal for Detail */}
          <div style={{ width: '100%', maxWidth: '850px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '0.5rem', animation: 'fadeIn 0.6s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '50px', height: '50px', backgroundColor: '#10b981', color: 'white', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}>
                <svg className="animated-check" width="30" height="30" viewBox="0 0 52 52">
                  <circle className="check-circle" cx="26" cy="26" r="25" fill="none" stroke="currentColor" strokeWidth="4" />
                  <path className="check-path" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" d="M14 27l7 7 16-16" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: 'bold', margin: 0 }}>Akses Diberikan</h2>
            </div>
            <button 
              onClick={returnToGate}
              style={{ backgroundColor: wristbandLinkedSuccess ? '#10b981' : '#64748b', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {wristbandLinkedSuccess ? 'Selesai & Lanjut' : 'Lewati / Kembali'} 
              {wristbandLinkedSuccess && (
                <span style={{ backgroundColor: 'rgba(255,255,255,0.3)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem' }}>{cooldown}s</span>
              )}
            </button>
          </div>

          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            {wristbandLinkedSuccess ? '✅ Gelang berhasil dikaitkan. Layar akan kembali otomatis...' : '💡 Silakan tembak scanner ke gelang Calisto, atau klik "Lewati" jika tanpa gelang.'}
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '2rem', width: '100%', maxWidth: '1000px', margin: 'auto' }}>
            
            {/* Bagian Kiri: ID Card Virtual */}
            <div style={{ perspective: '1000px', flex: '1 1 55%', maxWidth: '500px', minWidth: '300px', aspectRatio: '1.58 / 1', containerType: 'inline-size', animation: 'slideUpBounce 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <div style={{ 
                position: 'relative', width: '100%', height: '100%',
                background: 'url(\'/hornbill-card-bg.png\') center right / cover no-repeat, #064e3b', 
                borderRadius: '4cqi', 
                color: 'white',
                boxShadow: '0 15px 35px -5px rgba(6, 78, 59, 0.4)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '5cqi',
                animation: 'float 5s ease-in-out infinite'
              }}>
                {/* Header Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2cqi' }}>
                    <img src="/logo.png" alt="Aviary Park" style={{ height: '9cqi' }} />
                    <div style={{ height: '6cqi', width: '1px', backgroundColor: 'rgba(255,255,255,0.4)' }}></div>
                    <span style={{ fontSize: '2.5cqi', opacity: 0.9, fontWeight: '500' }}>Annual Pass Aktif</span>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '1cqi 3cqi', borderRadius: '5cqi', fontSize: '2.2cqi', fontWeight: 'bold', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {identifiedUser.role.toLowerCase() === 'primary' ? 'ACTIVE' : identifiedUser.role}
                  </div>
                </div>

                {/* Main Content */}
                <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', paddingBottom: '1cqi', maxWidth: '70%' }}>
                  <h3 style={{ margin: 0, fontSize: '6cqi', fontWeight: '800', lineHeight: '1.1', textShadow: '0 2px 4px rgba(0,0,0,0.5)', marginBottom: '3cqi' }}>
                    Aviary Park<br/>Annual Pass
                  </h3>
                  
                  <div style={{ marginBottom: '3cqi' }}>
                    <p style={{ margin: 0, fontSize: '2cqi', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Nama Pengunjung</p>
                    <p style={{ margin: 0, fontSize: '4cqi', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{identifiedUser.name}</p>
                  </div>

                  <div style={{ display: 'flex', gap: '5cqi' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '2cqi', opacity: 0.8, textTransform: 'uppercase' }}>Berlaku hingga</p>
                      <p style={{ margin: 0, fontSize: '2.8cqi', fontWeight: 'bold', color: '#facc15' }}>
                        {identifiedUser.activation_date ? (() => {
                          const actDate = new Date(identifiedUser.activation_date);
                          const expDate = new Date(actDate);
                          expDate.setFullYear(expDate.getFullYear() + 1);
                          return expDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                        })() : '-'}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '2cqi', opacity: 0.8, textTransform: 'uppercase' }}>NIK</p>
                      <p style={{ margin: 0, fontSize: '2.8cqi', fontWeight: 'bold' }}>
                        {identifiedUser.nik && identifiedUser.nik.length === 16
                          ? `${identifiedUser.nik.substring(0, 6)}******${identifiedUser.nik.substring(12)}`
                          : identifiedUser.nik || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian Kanan: Info Paket, Scan Gelang Calisto, & Rombongan */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.95)', padding: '1.25rem', borderRadius: '1.2rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flex: '1 1 40%', maxWidth: '420px', minWidth: '300px', maxHeight: '65vh', overflowY: 'auto', boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.05)', animation: 'slideInRight 0.6s ease-out 0.2s both' }}>
              
              {/* MODUL SCAN GELANG CALISTO INSTAN */}
              <div style={{ 
                backgroundColor: wristbandLinkedSuccess ? '#f0fdf4' : '#f8fafc', 
                border: wristbandLinkedSuccess ? '2px solid #10b981' : '1.5px dashed #059669', 
                borderRadius: '0.85rem', 
                padding: '1rem', 
                marginBottom: '1.25rem' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: wristbandLinkedSuccess ? '#15803d' : '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>🎟️</span> {wristbandLinkedSuccess ? 'GELANG TERKAIT HARI INI' : 'KAITKAN GELANG CALISTO'}
                  </span>
                  {identifiedUser?.card_uid && (
                    <span style={{ fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.15rem 0.4rem', borderRadius: '0.3rem', fontFamily: 'monospace' }}>
                      {identifiedUser.card_uid}
                    </span>
                  )}
                </div>

                {wristbandLinkedSuccess ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontSize: '0.85rem', fontWeight: '700' }}>
                    <span>✅</span> Gelang siap dipakai masuk & potong kuota wahana!
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); handleLinkWristband(wristbandCode); }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        ref={wristbandInputRef}
                        type="text"
                        autoFocus
                        placeholder="Tembak scanner ke gelang Calisto..."
                        value={wristbandCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWristbandCode(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && wristbandCode.trim()) {
                            e.preventDefault();
                            handleLinkWristband(wristbandCode.trim());
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '0.6rem 0.8rem',
                          borderRadius: '0.5rem',
                          border: '1.5px solid #059669',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={isLinkingWristband || !wristbandCode.trim()}
                        style={{
                          backgroundColor: '#059669',
                          color: '#fff',
                          border: 'none',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '0.5rem',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          opacity: isLinkingWristband || !wristbandCode.trim() ? 0.6 : 1
                        }}
                      >
                        {isLinkingWristband ? 'Menyimpan...' : 'Kaitkan Otomatis'}
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', marginTop: '0.35rem' }}>
                      💡 Kasir cukup tembakkan barcode scanner ke gelang Calisto (otomatis terisi & tersimpan).
                    </p>
                  </form>
                )}
              </div>

              {/* Info Paket Tiket */}
              <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px dashed #cbd5e1' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Paket Tiket Terdaftar</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ backgroundColor: '#10b981', color: 'white', padding: '0.5rem', borderRadius: '0.5rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2"></path></svg>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 'bold' }}>
                      {(() => {
                        const userCount = identifiedFamily.length + 1;
                        const matchedPackage = packages
                          .filter(p => p.min_qty <= userCount && p.max_qty >= userCount)
                          .sort((a, b) => (a.max_qty - a.min_qty) - (b.max_qty - b.min_qty))[0];
                        return matchedPackage ? matchedPackage.name : 'Annual Pass - All Access';
                      })()}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#10b981', fontWeight: '600' }}>Valid & Aktif</p>
                  </div>
                </div>
              </div>

              {/* Rombongan */}
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Anggota Keluarga / Rombongan</p>
              
              {identifiedFamily.length > 0 ? (
                <>
                  <p style={{ fontSize: '0.8rem', color: '#eab308', backgroundColor: '#fefce8', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #fef08a', marginBottom: '1rem' }}>
                    ⚠️ Anggota rombongan harus melakukan scan wajah <b>satu per satu</b> secara bergantian.
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, maxHeight: '200px' }}>
                    {identifiedFamily.map(fam => (
                      <li key={fam.id} style={{ fontSize: '0.95rem', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontWeight: '600' }}>{fam.name}</span>
                        <span style={{ fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{fam.role}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '1rem' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Tidak ada rombongan terdaftar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* Camera Feed */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '450px', margin: '0 auto', flex: 1, maxHeight: '55vh', backgroundColor: '#e2e8f0', borderRadius: '1rem', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
          <video 
            ref={videoRef} 
            onPlay={handleVideoPlay}
            autoPlay 
            muted 
            playsInline
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              position: 'absolute', 
              top: 0, left: 0,
              transform: 'scaleX(-1)' // Mirror effect to prevent confusion
            }}
          />
          <canvas 
            ref={canvasRef}
            style={{ 
              width: '100%', 
              height: '100%', 
              position: 'absolute', 
              top: 0, left: 0,
              transform: 'scaleX(-1)',
              zIndex: 1,
              pointerEvents: 'none'
            }}
          />
          
          {/* Laser Scanning Animation */}
          {gateStatus !== 'success' && (
            <div style={{
              position: 'absolute',
              left: 0,
              width: '100%',
              height: '4px',
              backgroundColor: '#10b981',
              boxShadow: '0 0 15px #10b981, 0 0 30px #10b981',
              animation: 'scanline 2.5s linear infinite',
              zIndex: 2
            }}></div>
          )}

          {/* Modern Smart Scanner Reticle */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(78%, 300px)',
            height: 'min(82%, 350px)',
            border: `2px dashed ${borderColor}`,
            borderRadius: '1.75rem',
            pointerEvents: 'none',
            boxShadow: '0 0 0 1000px rgba(15, 23, 42, 0.45)',
            transition: 'all 0.3s ease',
            animation: gateStatus === 'idle' || gateStatus === 'loading' ? 'pulseBorder 2.5s infinite' : 'none',
            zIndex: 1
          }}>
            {/* 4 Corner Markers on the Box */}
            <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '24px', height: '24px', borderTop: `4px solid ${borderColor}`, borderLeft: `4px solid ${borderColor}`, borderTopLeftRadius: '1.25rem' }}></div>
            <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '24px', height: '24px', borderTop: `4px solid ${borderColor}`, borderRight: `4px solid ${borderColor}`, borderTopRightRadius: '1.25rem' }}></div>
            <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '24px', height: '24px', borderBottom: `4px solid ${borderColor}`, borderLeft: `4px solid ${borderColor}`, borderBottomLeftRadius: '1.25rem' }}></div>
            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '24px', height: '24px', borderBottom: `4px solid ${borderColor}`, borderRight: `4px solid ${borderColor}`, borderBottomRightRadius: '1.25rem' }}></div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', marginTop: '1.5rem' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>
            Sistem pemindai akan otomatis mendeteksi wajah dalam kotak.<br/>
            Pastikan pencahayaan terang dan pengunjung tidak memakai kacamata hitam atau masker tebal.
          </p>
        </div>
      </div>
    </div>
  );
}
