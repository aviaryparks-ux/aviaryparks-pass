"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as faceapi from 'face-api.js';
import { supabase } from '@/lib/supabase';

export default function FaceSetup() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [message, setMessage] = useState('Memuat model AI...');
  
  const [groupId, setGroupId] = useState('');
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paymentPending, setPaymentPending] = useState(false);

  const router = useRouter();

  const fetchMembers = async (storedGroupId: string) => {
    if (!storedGroupId) return;
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('group_id', storedGroupId)
      .order('created_at', { ascending: true });

    if (data && !error && data.length > 0) {
      // Periksa apakah pembayaran sudah lunas (status ACTIVE)
      const isPaid = data[0].status === 'ACTIVE';
      if (!isPaid) {
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
            const withoutFace = data.filter(m => m.face_descriptor === null);
            setPendingMembers(withoutFace);
            return;
          }
        } catch (e) {
          console.error(e);
        }

        setPaymentPending(true);
        return;
      }

      setPaymentPending(false);
      // Filter yang belum ada wajahnya
      const withoutFace = data.filter(m => m.face_descriptor === null);
      setPendingMembers(withoutFace);
    }
  };

  useEffect(() => {
    let storedGroupId = '';
    if (typeof window !== 'undefined') {
      storedGroupId = localStorage.getItem('tempGroupId') || '';
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
        
        const { error } = await supabase
          .from('members')
          .update({ face_descriptor: descriptorArray })
          .eq('id', currentMember.id);

        if (error) {
          console.error(error);
          setMessage('Gagal menyimpan wajah ke database.');
          setIsDetecting(false);
          return;
        }

        if (currentIndex + 1 < pendingMembers.length) {
          setMessage(`Wajah ${currentMember.name} Terekam! Beralih ke anggota berikutnya...`);
          setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            setIsDetecting(false);
            setMessage(`Sekarang giliran: ${pendingMembers[currentIndex + 1].name}`);
          }, 2000);
        } else {
          setMessage('Semua wajah keluarga berhasil direkam! Beralih ke Dashboard...');
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
    return <div className="container hero"><p>Sesi tidak valid. Harap mulai dari pendaftaran.</p></div>;
  }

  if (paymentPending) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="glass-panel" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h2>Menunggu Pembayaran ⏳</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '1.5rem 0' }}>
            Sistem mendeteksi bahwa tiket Anda belum lunas atau masih dalam proses pengecekan oleh pihak bank. 
            Anda tidak dapat mendaftarkan wajah sebelum pembayaran diselesaikan.
          </p>
          <button onClick={() => fetchMembers(groupId)} className="btn btn-secondary" style={{ width: '100%', marginBottom: '1rem' }}>
            Cek Status Pembayaran (Refresh)
          </button>
          <button onClick={() => router.push('/payment')} className="btn btn-primary" style={{ width: '100%' }}>
            Kembali ke Halaman Pembayaran
          </button>
        </div>
      </div>
    );
  }

  if (pendingMembers.length === 0) {
    return <div className="container hero"><p>Semua anggota keluarga sudah memiliki data biometrik.</p><button onClick={() => router.push('/dashboard')} className="btn btn-primary">Ke Dashboard</button></div>;
  }

  const currentMember = pendingMembers[currentIndex];

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', padding: '2rem 0' }}>
      <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>Pendaftaran Wajah</h2>
        <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem', border: '1px solid #bbf7d0' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Anggota {currentIndex + 1} dari {pendingMembers.length}
          </p>
          <h3 style={{ color: 'var(--primary-dark)', fontSize: '1.5rem' }}>Giliran: {currentMember?.name}</h3>
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto 2rem', borderRadius: '1rem', overflow: 'hidden', backgroundColor: '#000' }}>
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '200px',
            height: '250px',
            border: '2px dashed var(--primary-color)',
            borderRadius: '50%',
            boxShadow: '0 0 0 4000px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }}></div>
        </div>

        <p style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>{message}</p>

        <button 
          onClick={handleCapture} 
          disabled={!isModelLoaded || isDetecting}
          className="btn btn-primary" 
          style={{ width: '100%', maxWidth: '300px', padding: '1rem', fontSize: '1.1rem', opacity: (!isModelLoaded || isDetecting) ? 0.7 : 1 }}
        >
          {isDetecting ? 'Memproses...' : `Tangkap Wajah ${currentMember?.name}`}
        </button>
      </div>
    </div>
  );
}
