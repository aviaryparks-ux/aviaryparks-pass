"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function PrintCard() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const storedId = localStorage.getItem('tempUserId');
      if (storedId) {
        const { data } = await supabase.from('members').select('*').eq('id', storedId).single();
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
      
      {/* Container yang dirancang khusus untuk Print (ukuran mirip ID Card besar) */}
      <div className="print-container" style={{ 
        width: '85.6mm', // Ukuran standar ID Card (CR80) landscape
        height: '53.98mm',
        background: 'linear-gradient(135deg, #10b981, #059669)',
        borderRadius: '8px',
        padding: '5mm',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'sans-serif',
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}>
        {/* Dekorasi Air */}
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '60px', height: '60px', background: 'rgba(255,255,255,0.15)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '-15px', left: '-15px', width: '40px', height: '40px', background: 'rgba(255,255,255,0.15)', borderRadius: '50%' }}></div>

        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.5px' }}>AVIARY PARK</h1>
              <p style={{ margin: 0, fontSize: '8px', opacity: 0.9 }}>ANNUAL PASS MEMBER</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 'bold' }}>
              {user.status}
            </div>
          </div>

          <div>
            <p style={{ margin: '0 0 2px 0', fontSize: '8px', opacity: 0.8 }}>NAMA MEMBER</p>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{user.name}</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '8px', opacity: 0.8 }}>NIK: {user.nik}</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ margin: '0 0 2px 0', fontSize: '7px', opacity: 0.8 }}>BERLAKU HINGGA</p>
              <p style={{ margin: 0, fontSize: '9px', fontWeight: 'bold' }}>
                {expiration.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '7px', opacity: 0.8 }}>Tipe: {user.role}</p>
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
          @page {
            size: 85.6mm 53.98mm landscape;
            margin: 0;
          }
        }
      `}} />
    </div>
  );
}
