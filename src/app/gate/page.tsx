"use client";

import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function GateScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
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
  const [cooldown, setCooldown] = useState(7);
  const [isCooldownPaused, setIsCooldownPaused] = useState(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const membersRef = useRef<any[]>([]);
  const faceMatcherRef = useRef<faceapi.FaceMatcher | null>(null);
  const lastScansRef = useRef<Record<string, number>>({}); 
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const returnToGate = () => {
    setViewMode('SCANNING');
    setGateStatus('idle');
    setIdentifiedUser(null);
    setIdentifiedFamily([]);
    setStatusMsg('Sistem siap. Menunggu pengunjung...');
  };

  useEffect(() => {
    if (viewModeState === 'DETAIL') {
      if (!isCooldownPaused && cooldown > 0) {
        cooldownTimerRef.current = setTimeout(() => {
          setCooldown(prev => prev - 1);
        }, 1000);
      } else if (cooldown === 0 && !isCooldownPaused) {
        returnToGate();
      }
    }
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, [viewModeState, cooldown, isCooldownPaused]);

  useEffect(() => {
    const initScanner = async () => {
      try {
        // 1. Muat Model AI
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);

        // 2. Ambil data wajah dari Supabase (Ambil semua agar bisa lihat data keluarga)
        const { data, error } = await supabase
          .from('members')
          .select('*');

        if (error || !data || data.length === 0) {
          setStatusMsg('Tidak ada data pengunjung di database. Silakan daftarkan terlebih dahulu.');
          setGateStatus('idle');
          return;
        }

        membersRef.current = data;

        // 3. Persiapkan FaceMatcher hanya untuk yang punya data wajah
        const membersWithFaces = data.filter(m => m.face_descriptor);
        
        if (membersWithFaces.length === 0) {
          setStatusMsg('Tidak ada biometrik tersimpan di database.');
          setGateStatus('idle');
          return;
        }

        const labeledDescriptors = membersWithFaces.map(member => {
          // face_descriptor disimpan sebagai array di JSON, kita ubah kembali ke Float32Array
          const descArray = new Float32Array(member.face_descriptor);
          return new faceapi.LabeledFaceDescriptors(member.id, [descArray]);
        });

        // Toleransi kecocokan 0.6 (semakin kecil semakin ketat)
        faceMatcherRef.current = new faceapi.FaceMatcher(labeledDescriptors, 0.6);

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
    } catch (err) {
      setStatusMsg('Akses kamera ditolak. Pastikan kamera diizinkan.');
      setGateStatus('denied');
    }
  };

  const handleVideoPlay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Scan setiap 500ms agar performa komputer tidak berat
    intervalRef.current = setInterval(async () => {
      if (viewModeRef.current === 'DETAIL') return; // Pause scanning if in detail mode
      if (!videoRef.current || !faceMatcherRef.current) return;
      if (videoRef.current.paused || videoRef.current.ended) return;

      const detection = await faceapi.detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const match = faceMatcherRef.current.findBestMatch(detection.descriptor);
        
        if (match.label !== 'unknown') {
          handleMatch(match.label);
        } else {
          handleUnknown();
        }
      } else {
        // Opsional: kembali ke mode idle jika beberapa detik tidak ada wajah
      }
    }, 500);
  };

  const handleMatch = async (memberId: string) => {
    const member = membersRef.current.find(m => m.id === memberId);
    if (!member) return;

    // Cek Status Keaktifan
    if (member.status !== 'ACTIVE') {
      setStatusMsg(`Akses Ditolak: Tiket ${member.name} belum dibayar / kadaluarsa.`);
      setGateStatus('denied');
      setIdentifiedUser(member);
      return;
    }

    // Cek Spam (Cooldown 60 detik)
    const now = Date.now();
    const lastScan = lastScansRef.current[memberId] || 0;
    if (now - lastScan < 60000) {
      // Sudah terekam beberapa detik lalu, cukup tampilkan hijau tanpa rekam database lagi
      setStatusMsg(`Akses Diberikan: Selamat bersenang-senang, ${member.name}!`);
      setGateStatus('success');
      setIdentifiedUser(member);
      return;
    }

    // Rekam Kunjungan Baru
    lastScansRef.current[memberId] = now;
    setStatusMsg(`Akses Diberikan: Selamat bersenang-senang, ${member.name}!`);
    setGateStatus('success');
    setIdentifiedUser(member);
    setIdentifiedFamily(membersRef.current.filter(m => m.group_id === member.group_id && m.id !== member.id));

    setViewMode('DETAIL');
    setCooldown(7);
    setIsCooldownPaused(false);

    // Simpan ke tabel visits secara diam-diam (background)
    await supabase.from('visits').insert([{
      member_id: member.id,
      status: 'SUCCESS'
    }]);
  };

  const handleUnknown = () => {
    setStatusMsg('Wajah Tidak Dikenali');
    setGateStatus('denied');
    setIdentifiedUser(null);
    setIdentifiedFamily([]);
  };

  // Pengaturan Warna UI Dinamis
  let borderColor = '#94a3b8';
  let bgColor = '#f8fafc';
  let textColor = '#334155';
  let icon = '⏳';
  
  if (gateStatus === 'success') {
    borderColor = '#22c55e'; // Green
    bgColor = '#f0fdf4';
    textColor = '#16a34a';
    icon = '✅';
  } else if (gateStatus === 'denied') {
    borderColor = '#ef4444'; // Red
    bgColor = '#fef2f2';
    textColor = '#dc2626';
    icon = '❌';
  } else if (gateStatus === 'loading') {
    icon = '⚙️';
  } else {
    icon = '👁️';
  }

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', 
      background: `url('/hero-new.jpg') center center / cover no-repeat`,
      position: 'relative'
    }}>
      
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

        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '13rem' }}>
          <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.4rem 1.2rem', borderRadius: '2rem', fontWeight: 'bold', fontSize: '1rem' }}>
            LOKET
          </div>
        </div>

        <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', backgroundColor: 'rgba(255,255,255,0.9)', textDecoration: 'none', border: '1px solid #16a34a', padding: '0.6rem 1.2rem', borderRadius: '2rem', fontSize: '0.9rem', fontWeight: '600', backdropFilter: 'blur(4px)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Kembali ke Admin
        </Link>
      </div>

      {/* Main Scanner Container */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%', 
        maxWidth: '850px', 
        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
        borderRadius: '1.5rem', 
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(10px)',
        padding: '1.5rem',
        marginTop: '1rem',
        marginBottom: '2rem',
        zIndex: 10
      }}>
        
        {/* Status Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: bgColor, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem', flexShrink: 0, border: `2px solid ${borderColor}40` }}>
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
      </div>

      {/* Detail Overlay Penuh */}
      {viewModeState === 'DETAIL' && identifiedUser && (
        <div 
          style={{ 
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(248, 250, 252, 0.95)', zIndex: 100,
            backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '2rem', overflowY: 'auto'
          }}
          onMouseDown={() => setIsCooldownPaused(true)}
          onMouseUp={() => setIsCooldownPaused(false)}
          onMouseLeave={() => setIsCooldownPaused(false)}
          onTouchStart={() => setIsCooldownPaused(true)}
          onTouchEnd={() => setIsCooldownPaused(false)}
        >
          {/* Header internal for Detail */}
          <div style={{ width: '100%', maxWidth: '850px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', marginTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '50px', height: '50px', backgroundColor: '#10b981', color: 'white', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}>✅</div>
              <h2 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: 'bold', margin: 0 }}>Akses Diberikan</h2>
            </div>
            <button 
              onClick={returnToGate}
              style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(16,185,129,0.2)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Kembali ke Gate 
              <span style={{ backgroundColor: 'rgba(255,255,255,0.3)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem' }}>{cooldown}s</span>
            </button>
          </div>

          <div style={{ width: '100%', maxWidth: '850px', backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <p style={{ textAlign: 'center', color: isCooldownPaused ? '#10b981' : '#64748b', marginBottom: '2rem', fontWeight: isCooldownPaused ? 'bold' : 'normal', transition: 'color 0.3s' }}>
              {isCooldownPaused ? 'Waktu dijeda. Lepaskan untuk melanjutkan.' : 'Tahan (Hold) layar ini untuk menghentikan waktu mundur.'}
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              
              {/* ID Card Virtual */}
              <div style={{ 
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
                padding: '1.5rem', 
                borderRadius: '1rem', 
                color: 'white',
                boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
                  <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Aviary Park</h4>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Annual Pass</h3>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.3rem 0.8rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {identifiedUser.role}
                  </div>
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>Nama Pengunjung</p>
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{identifiedUser.name}</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>NIK</p>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{identifiedUser.nik || '-'}</p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>Sisa Masa Aktif</p>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>
                        {identifiedUser.activation_date ? (() => {
                          const actDate = new Date(identifiedUser.activation_date);
                          const expDate = new Date(actDate);
                          expDate.setFullYear(expDate.getFullYear() + 1);
                          const diff = Math.ceil((expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          return diff > 0 ? `${diff} Hari Lagi` : 'Kedaluwarsa';
                        })() : '-'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>Alamat</p>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {identifiedUser.address || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rombongan */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Anggota Keluarga Lainnya</p>
                {identifiedFamily.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1 }}>
                    {identifiedFamily.map(fam => (
                      <li key={fam.id} style={{ fontSize: '0.9rem', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '500' }}>{fam.name}</span>
                        <span style={{ fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.15rem 0.4rem', borderRadius: '1rem', fontWeight: 'bold' }}>{fam.role}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic', flex: 1, display: 'flex', alignItems: 'center' }}>Tidak ada rombongan terdaftar.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Camera Feed */}
        <div style={{ position: 'relative', width: '100%', backgroundColor: '#e2e8f0', minHeight: '450px', borderRadius: '1rem', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <video 
            ref={videoRef} 
            onPlay={handleVideoPlay}
            autoPlay 
            muted 
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
          />
          
          {/* Overlay Targeting Reticle */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '220px',
            height: '320px',
            border: `3px solid ${borderColor}`,
            borderRadius: '50%',
            pointerEvents: 'none',
            boxShadow: '0 0 0 2000px rgba(0,0,0,0.4)',
            transition: 'border-color 0.3s ease'
          }}></div>

          {/* Corner Brackets */}
          <div style={{ position: 'absolute', top: '20px', left: '20px', width: '40px', height: '40px', borderTop: '4px solid rgba(255,255,255,0.7)', borderLeft: '4px solid rgba(255,255,255,0.7)', borderRadius: '8px 0 0 0' }}></div>
          <div style={{ position: 'absolute', top: '20px', right: '20px', width: '40px', height: '40px', borderTop: '4px solid rgba(255,255,255,0.7)', borderRight: '4px solid rgba(255,255,255,0.7)', borderRadius: '0 8px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', width: '40px', height: '40px', borderBottom: '4px solid rgba(255,255,255,0.7)', borderLeft: '4px solid rgba(255,255,255,0.7)', borderRadius: '0 0 0 8px' }}></div>
          <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '40px', height: '40px', borderBottom: '4px solid rgba(255,255,255,0.7)', borderRight: '4px solid rgba(255,255,255,0.7)', borderRadius: '0 0 8px 0' }}></div>
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
