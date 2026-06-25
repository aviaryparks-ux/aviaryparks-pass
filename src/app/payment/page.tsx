"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Payment() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [groupId, setGroupId] = useState('');
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
         const { data: membersData } = await supabase.from('members').select('id').eq('group_id', activeGroupId);
         if (membersData && membersData.length > 0) {
            actualUserCount = membersData.length;
            setUserCount(actualUserCount);
            if (typeof window !== 'undefined') {
               localStorage.setItem('tempUserCount', actualUserCount.toString());
            }
         }
      }

      if (storedPackageId) {
        const { data, error } = await supabase
          .from('ticket_packages')
          .select('*')
          .eq('id', storedPackageId)
          .single();
          
        if (data && !error) {
          setTicketPrice(Number(data.price));
          setPackageName(data.name);
        } else {
          setTicketPrice(150000 * actualUserCount);
          setPackageName('Harga Normal');
        }
      } else {
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
        } else {
          setTicketPrice(150000 * actualUserCount);
          setPackageName('Harga Normal');
        }
      }
      setFetchingPrice(false);
    };

    fetchPrice();
  }, []);

  const handlePayment = async () => {
    if (!groupId) {
      alert('Sesi tidak valid, silakan daftar ulang.');
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
        alert('Gagal membuat tagihan pembayaran: ' + (data.error || 'Unknown Error'));
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat memproses pembayaran.');
      setIsLoading(false);
    }
  };

  const totalPayment = ticketPrice;

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem 0' }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>Selesaikan Pembayaran</h2>
        <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
          Halo {userName}, selesaikan pembayaran untuk mengaktifkan tiket keluarga Anda.
        </p>
        
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', textAlign: 'left', border: '1px solid #e2e8f0' }}>
          <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Paket Terpilih</span>
            <span style={{ fontWeight: 'bold' }}>{fetchingPrice ? '...' : packageName}</span>
          </p>
          <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Jumlah Anggota</span>
            <span>{userCount} Orang</span>
          </p>
          <div style={{ borderTop: '2px dashed #cbd5e1', margin: '0.5rem 0' }}></div>
          <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem' }}>
            <span>Total Tagihan</span>
            <span style={{ color: 'var(--primary-dark)' }}>
              {fetchingPrice ? 'Menghitung...' : `Rp ${totalPayment.toLocaleString('id-ID')}`}
            </span>
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Metode Pembayaran</label>
          <select 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
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
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <strong>Keamanan Transaksi:</strong> Anda akan diarahkan ke halaman resmi Duitku untuk pembayaran yang aman.
          </p>
          <button onClick={handlePayment} disabled={isLoading || fetchingPrice} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
            {isLoading ? 'Memproses...' : `Bayar Sekarang (Rp ${totalPayment.toLocaleString('id-ID')})`}
          </button>
        </div>
      </div>
    </div>
  );
}
