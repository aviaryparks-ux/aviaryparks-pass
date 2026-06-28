"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function PrintCard() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const storedId = urlParams.get('id') || localStorage.getItem('tempUserId');
      if (storedId) {
        const res = await fetch('/api/visitor/members?id=' + storedId + '&single=true');
        const json = await res.json();
        const data = json.data;
        if (data) {
          setUser(data);
          // Otomatis memicu kotak dialog Print saat data sudah siap
          setTimeout(() => {
            window.print();
          }, 1000);
        }
      }
    };
    fetchUser();
  }, []);

  if (!user) return <div style={{ padding: '2rem' }}>Memuat tiket untuk dicetak...</div>;

  const activation = new Date(user.activation_date || new Date());
  const expiration = new Date(activation);
  expiration.setFullYear(expiration.getFullYear() + 1);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', background: '#fff', padding: '2rem' }}>
      
      {/* Container for Front Card */}
      <div className="print-container front-card" style={{ 
        width: '85.6mm',
        height: '53.98mm',
        background: 'url(\'/hornbill-card-bg.png\') center right / cover no-repeat, #064e3b',
        borderRadius: '4mm',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'sans-serif',
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        padding: '5mm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        pageBreakAfter: 'always'
      }}>
        {/* Header Card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
            <img src="/logo.png" alt="Aviary Park" style={{ height: '8mm' }} />
            <div style={{ height: '6mm', width: '1px', backgroundColor: 'rgba(255,255,255,0.4)' }}></div>
            <span style={{ fontSize: '2.5mm', opacity: 0.9, fontWeight: '500' }}>Annual Pass Aktif</span>
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '1mm 3mm', borderRadius: '5mm', fontSize: '2.2mm', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
            {user.status === 'ACTIVE' || user.status === 'primary' || user.role === 'PRIMARY' ? 'ACTIVE' : (user.status || 'ACTIVE')}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', paddingBottom: '1mm', maxWidth: '70%' }}>
          <h3 style={{ margin: 0, fontSize: '6mm', fontWeight: '800', lineHeight: '1.1', textShadow: '0 1px 2px rgba(0,0,0,0.5)', marginBottom: '3mm' }}>
            Aviary Park<br/>Annual Pass
          </h3>
          
          <div style={{ marginBottom: '3mm' }}>
            <p style={{ margin: 0, fontSize: '2mm', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nama Pengunjung</p>
            <p style={{ margin: 0, fontSize: '4.5mm', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
          </div>

          <div style={{ display: 'flex', gap: '5mm' }}>
            <div>
              <p style={{ margin: 0, fontSize: '2mm', opacity: 0.8, textTransform: 'uppercase' }}>Berlaku hingga</p>
              <p style={{ margin: 0, fontSize: '2.8mm', fontWeight: 'bold', color: '#facc15' }}>
                {expiration.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '2mm', opacity: 0.8, textTransform: 'uppercase' }}>NIK</p>
              <p style={{ margin: 0, fontSize: '2.8mm', fontWeight: 'bold' }}>{user.nik || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Container for Back Card */}
      <div className="print-container back-card" style={{ 
        width: '85.6mm',
        height: '53.98mm',
        background: 'url(\'/hornbill-card-bg.png\') center right / cover no-repeat, #064e3b',
        borderRadius: '4mm',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'sans-serif',
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top Text */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3mm 4mm 1mm 4mm', fontSize: '2mm', opacity: 0.9 }}>
          <span>Kartu ini adalah milik Aviary Park Indonesia.</span>
          <span>APID-{user.id?.substring(0, 8) || '250625-0001'}</span>
        </div>
        
        {/* Content columns */}
        <div style={{ display: 'flex', padding: '2mm 4mm 4mm 4mm', flex: 1, gap: '2mm' }}>
          
          {/* Left Column: T&C */}
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '2mm' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1mm', marginBottom: '1mm', color: '#86efac' }}>
              <svg width="2.5mm" height="2.5mm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              <span style={{ fontSize: '2mm', fontWeight: 'bold' }}>Syarat & Ketentuan</span>
            </div>
            <ul style={{ paddingLeft: '2.5mm', margin: 0, fontSize: '1.4mm', opacity: 0.9, display: 'flex', flexDirection: 'column', gap: '0.4mm' }}>
              <li>Kartu berlaku untuk satu orang dan tidak dapat dipindahtangankan.</li>
              <li>Wajib ditunjukkan saat memasuki area Aviary Park.</li>
              <li>Tidak berlaku pada acara khusus / tiket tambahan.</li>
              <li>Kehilangan kartu bukan tanggung jawab manajemen.</li>
              <li>Syarat & ketentuan dapat berubah sewaktu-waktu.</li>
            </ul>
            
            {/* Real Barcode API */}
            <div style={{ marginTop: 'auto', background: 'white', padding: '1mm', borderRadius: '1mm', display: 'flex', justifyContent: 'center' }}>
              <img 
                src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${user.nik || user.id?.substring(0, 8) || '250625-0001'}&scale=2&height=10&includetext`} 
                alt="Barcode" 
                style={{ width: '100%', height: '6.5mm', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Right Column: Contact without Logo */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: '1.5mm', position: 'relative', zIndex: 1, textAlign: 'right' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1mm', fontSize: '1.8mm', opacity: 0.9, width: '100%' }}>
              <span>www.aviarypark.com</span>
              <svg width="2.5mm" height="2.5mm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1mm', fontSize: '1.8mm', opacity: 0.9, width: '100%' }}>
              <span>@aviaryparkindonesia</span>
              <svg width="2.5mm" height="2.5mm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: '1mm', fontSize: '1.8mm', opacity: 0.9, width: '100%' }}>
              <span>Jl. Bintaro Creative District No.15, Pd. Ranji,<br/>Kec. Ciputat Tim., Kota Tangerang Selatan,<br/>Banten 15224</span>
              <svg width="2.5mm" height="2.5mm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginTop: '0.1rem' }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            box-shadow: none !important;
          }
          .back-card {
            top: 53.98mm; /* Place back card on second page conceptually */
          }
          @page {
            size: 85.6mm 53.98mm landscape;
            margin: 0;
          }
        }
      `}} />
    </div>
  );
}
