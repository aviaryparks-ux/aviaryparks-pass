"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as faceapi from 'face-api.js';
import { supabase } from '@/lib/supabase';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: 'relative', minHeight: '100dvh', overflowX: 'hidden' }}>
    {/* Background Image */}
    <div style={{ position: 'fixed', inset: 0, backgroundImage: 'url(/payment_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }}></div>

    {/* 3D Trapezoid Logo Tab */}
    <div style={{ 
      position: 'absolute', 
      top: 0,
      left: 'max(1rem, 5%)',
      padding: '1rem 2rem 1.5rem 2rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 20
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
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

    <div style={{ position: 'relative', zIndex: 10, width: '100%', minHeight: '100dvh' }}>
      {children}
    </div>
  </div>
);

export default function FaceSetup() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [message, setMessage] = useState('Memuat model AI...');
  
  const [groupId, setGroupId] = useState('');
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paymentPending, setPaymentPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [debugData, setDebugData] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  const router = useRouter();

  const fetchMembers = async (storedGroupId: string) => {
    if (!storedGroupId) return;
    try {
      const res = await fetch('/api/face/pending-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: storedGroupId })
      });
      const json = await res.json();
      
      if (json.success && json.data) {
        if (json.data.length === 0) {
          console.warn('No members found for group_id:', storedGroupId);
          setErrorMsg('Data anggota tidak ditemukan. Harap pastikan pendaftaran berhasil.');
        } else {
          const data = json.data;
          
          // Periksa apakah ada anggota yang masih PENDING_PAYMENT
          const hasPending = data.some((m: any) => m.status === 'PENDING_PAYMENT');
          
          if (hasPending) {
            // Coba periksa ke Duitku secara langsung sebagai fallback jika webhook lambat/gagal
            try {
              const res = await fetch('/api/payment/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId: storedGroupId })
              });
              const result = await res.json();
              if (result.success && result.status === 'ACTIVE') {
                setPaymentPending(false);
                
                // Karena status di database mungkin belum terupdate di sisi klien, kita asumsikan semua bisa direkam
                const withoutFace = data.filter((m: any) => {
                  if (!m.face_descriptor) return true;
                  if (m.face_descriptor === '[]' || m.face_descriptor === '{}' || m.face_descriptor === '') return true;
                  if (typeof m.face_descriptor === 'object' && !Array.isArray(m.face_descriptor) && Object.keys(m.face_descriptor).length === 0) return true;
                  if (Array.isArray(m.face_descriptor) && m.face_descriptor.length === 0) return true;
                  if (typeof m.face_descriptor === 'string') {
                    try {
                      const parsed = JSON.parse(m.face_descriptor);
                      if (Array.isArray(parsed) && parsed.length === 0) return true;
                    } catch (e) {}
                  }
                  return false;
                });
                
                if (withoutFace.length === 0) {
                  setDebugData(JSON.stringify(data.map((m: any) => ({ name: m.name, fd: m.face_descriptor })), null, 2));
                }

                setPendingMembers(withoutFace);
                setIsLoading(false);
                return;
              }
            } catch (e) {
              console.error(e);
            }

            setPaymentPending(true);
            setIsLoading(false);
            return;
          }

          setPaymentPending(false);
          // Filter yang belum ada wajahnya
          const withoutFace = data.filter((m: any) => {
            if (!m.face_descriptor) return true;
            if (m.face_descriptor === '[]' || m.face_descriptor === '{}' || m.face_descriptor === '') return true;
            if (typeof m.face_descriptor === 'object' && !Array.isArray(m.face_descriptor) && Object.keys(m.face_descriptor).length === 0) return true;
            if (Array.isArray(m.face_descriptor) && m.face_descriptor.length === 0) return true;
            if (typeof m.face_descriptor === 'string') {
              try {
                const parsed = JSON.parse(m.face_descriptor);
                if (Array.isArray(parsed) && parsed.length === 0) return true;
              } catch (e) {}
            }
            return false;
          });

          if (withoutFace.length === 0) {
            setDebugData(JSON.stringify(data.map((m: any) => ({ name: m.name, fd: m.face_descriptor })), null, 2));
          }

          setPendingMembers(withoutFace);
        }
      } else {
        console.error('API Error:', json.error);
        setErrorMsg('Terjadi kesalahan saat mengambil data anggota: ' + (json.error || 'Unknown Error'));
      }
    } catch (err: any) {
      console.error('Fetch members error:', err);
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let storedGroupId = '';
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const resultCode = urlParams.get('resultCode');
      
      if (resultCode && resultCode !== '00') {
        window.location.href = '/payment';
        return;
      }

      const merchantOrderId = urlParams.get('merchantOrderId');
      if (merchantOrderId && merchantOrderId.length >= 36) {
        storedGroupId = merchantOrderId.substring(0, 36);
      } else {
        storedGroupId = localStorage.getItem('tempGroupId') || '';
      }
      
      if (storedGroupId) setGroupId(storedGroupId);
    }

    fetchMembers(storedGroupId);

    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setIsModelLoaded(true);
        setMessage('Model siap. Meminta akses kamera...');
        // We will start video later if payment is confirmed
      } catch (err) {
        console.error(err);
        setMessage('Gagal memuat model. Pastikan koneksi lancar.');
      }
    };
    
    loadModels();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Memulai kamera hanya jika pembayaran sudah selesai
  useEffect(() => {
    if (isModelLoaded && !paymentPending && pendingMembers.length > 0) {
      startVideo();
    }
  }, [isModelLoaded, paymentPending, pendingMembers.length]);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setMessage('Kamera aktif. Harap posisikan wajah di tengah.');
        }
      })
      .catch((err) => {
        console.error(err);
        setMessage('Akses kamera ditolak.');
      });
  };

  const handleCapture = async () => {
    if (!videoRef.current || !isModelLoaded || pendingMembers.length === 0) return;
    
    setIsDetecting(true);
    setMessage('Menganalisis wajah...');

    try {
      const detection = await faceapi.detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const descriptorArray = Array.from(detection.descriptor);
        const currentMember = pendingMembers[currentIndex];
        
        setMessage(`Menyimpan biometrik ${currentMember.name}...`);
        
        try {
          const response = await fetch('/api/face/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberId: currentMember.id,
              descriptorArray: descriptorArray
            })
          });
          
          const result = await response.json();

          if (!result.success) {
            console.error(result.error);
            setMessage('Gagal menyimpan wajah ke database.');
            setIsDetecting(false);
            return;
          }
        } catch (err) {
          console.error(err);
          setMessage('Terjadi kesalahan jaringan saat menyimpan wajah.');
          setIsDetecting(false);
          return;
        }

        if (currentIndex + 1 < pendingMembers.length) {
          setMessage(`Wajah ${currentMember.name} Terekam! Beralih ke anggota berikutnya...`);
          setIsSuccess(true);
          setTimeout(() => {
            setIsSuccess(false);
            setCurrentIndex(prev => prev + 1);
            setIsDetecting(false);
            setMessage(`Sekarang giliran: ${pendingMembers[currentIndex + 1].name}`);
          }, 2000);
        } else {
          setMessage('Semua wajah keluarga berhasil direkam! Beralih ke Dashboard...');
          setIsSuccess(true);
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }

      } else {
        setMessage('Wajah tidak terdeteksi. Pastikan pencahayaan terang.');
        setIsDetecting(false);
      }
    } catch (err) {
      console.error(err);
      setMessage('Terjadi kesalahan saat mendeteksi wajah.');
      setIsDetecting(false);
    }
  };

  if (!groupId) {
    return (
      <PageWrapper>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
          <p style={{ background: '#fff', padding: '1rem 2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>Sesi tidak valid. Harap mulai dari pendaftaran.</p>
        </div>
      </PageWrapper>
    );
  }

  if (errorMsg) {
    return (
      <PageWrapper>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '2rem' }}>
          <div className="glass-panel" style={{ maxWidth: '400px', textAlign: 'center', backgroundColor: '#fff', padding: '2rem', borderRadius: '16px' }}>
            <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Terjadi Kesalahan</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{errorMsg}</p>
            <button onClick={() => router.push('/dashboard')} className="btn btn-primary" style={{ width: '100%' }}>
              Ke Dashboard
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (paymentPending) {
    return (
      <PageWrapper>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
          <div className="glass-panel" style={{ maxWidth: '400px', textAlign: 'center', backgroundColor: '#fff', padding: '2rem', borderRadius: '16px' }}>
            <h2>Menunggu Pembayaran ⏳</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '1.5rem 0' }}>
              Sistem mendeteksi bahwa tiket Anda belum lunas atau masih dalam proses pengecekan oleh pihak bank. 
            </p>
            <button onClick={() => fetchMembers(groupId)} className="btn btn-secondary" style={{ width: '100%', marginBottom: '1rem' }}>
              Cek Status Pembayaran (Refresh)
            </button>
            <button onClick={() => router.push('/payment')} className="btn btn-primary" style={{ width: '100%' }}>
              Kembali ke Halaman Pembayaran
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
          <h2 style={{ marginBottom: '1rem', textShadow: '0 2px 4px rgba(255,255,255,0.5)' }}>Mempersiapkan Face Setup...</h2>
          <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </PageWrapper>
    );
  }

  if (pendingMembers.length === 0) {
    return (
      <PageWrapper>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
          <div className="glass-panel" style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '16px', textAlign: 'center' }}>
            <p style={{ fontWeight: 'bold' }}>Semua anggota keluarga sudah memiliki data biometrik.</p>
            <button onClick={() => router.push('/dashboard')} className="btn btn-primary" style={{ marginTop: '1rem' }}>Ke Dashboard</button>
            {debugData && (
              <div style={{ marginTop: '2rem', textAlign: 'left', background: '#333', color: '#fff', padding: '1rem', borderRadius: '8px', maxWidth: '100%', overflow: 'auto' }}>
                <h4>[DEBUG INFO] - Data yang Ditolak oleh Filter:</h4>
                <pre style={{ fontSize: '12px' }}>{debugData}</pre>
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
    );
  }

  const currentMember = pendingMembers[currentIndex];

  return (
    <PageWrapper>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100dvh', padding: '6rem 1rem 2rem' }}>
        <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', textAlign: 'center', position: 'relative', overflow: 'hidden', backgroundColor: '#fff', padding: '2rem', borderRadius: '24px' }}>
        <h2 style={{ marginBottom: '1rem' }}>Pendaftaran Wajah</h2>
        <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem', border: '1px solid #bbf7d0' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Anggota {currentIndex + 1} dari {pendingMembers.length}
          </p>
          <h3 style={{ color: 'var(--primary-dark)', fontSize: '1.5rem' }}>Giliran: {currentMember?.name}</h3>
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto 2rem', borderRadius: '1rem', overflow: 'hidden', backgroundColor: '#000', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline
            style={{ width: '100%', height: 'auto', display: 'block', filter: isSuccess ? 'brightness(0.5)' : 'none', transition: 'filter 0.3s ease' }}
          />
          
          {/* Oval Overlay */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '200px',
            height: '250px',
            border: `2px ${isSuccess ? 'solid #22c55e' : 'dashed var(--primary-color)'}`,
            borderRadius: '50%',
            boxShadow: '0 0 0 4000px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            transition: 'border 0.3s ease'
          }}>
            {/* Scanning Line Animation */}
            {isDetecting && !isSuccess && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                background: 'var(--primary-color)',
                boxShadow: '0 0 10px var(--primary-color), 0 0 20px var(--primary-color)',
                animation: 'scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite'
              }}></div>
            )}
          </div>

          {/* Success Checkmark */}
          {isSuccess && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: '#22c55e',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
          )}
        </div>

        <p style={{ marginBottom: '1.5rem', fontWeight: 'bold', minHeight: '1.5rem', color: isSuccess ? '#22c55e' : 'var(--text-primary)' }}>{message}</p>

        <button 
          onClick={handleCapture} 
          disabled={!isModelLoaded || isDetecting || isSuccess}
          className="btn btn-primary" 
          style={{ width: '100%', maxWidth: '300px', padding: '1rem', fontSize: '1.1rem', opacity: (!isModelLoaded || isDetecting || isSuccess) ? 0.7 : 1, position: 'relative', overflow: 'hidden' }}
        >
          {isDetecting && !isSuccess ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
              Memproses...
            </span>
          ) : isSuccess ? 'Berhasil!' : `Tangkap Wajah ${currentMember?.name}`}
        </button>

        <style>{`
          @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          @keyframes popIn {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
            80% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
    </PageWrapper>
  );
}
