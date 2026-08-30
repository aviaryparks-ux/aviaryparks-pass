"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

import { supabase } from '@/lib/supabase';

interface ReportRow {
  date: string;
  member_number: string;
  name: string;
  group_id: string;
  total_pax: number;
}

export default function ReportsTab() {
  const [data, setData] = useState<ReportRow[]>([]);
  const [filteredData, setFilteredData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');
  const [customDate, setCustomDate] = useState<string>('');

  useEffect(() => {
    fetchData();

    // Subscribe to realtime visits for auto-update
    const channel = supabase
      .channel('realtime-visits')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'visits' },
        (payload) => {
          console.log('New visit received, refreshing reports...', payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilter();
  }, [data, dateFilter, customDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/reports');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error('Gagal mengambil data laporan');
      }
    } catch (error) {
      console.error(error);
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (dateFilter === 'ALL') {
      setFilteredData(data);
      return;
    }

    if (dateFilter === 'CUSTOM' && customDate) {
      const filtered = data.filter(item => item.date === customDate);
      setFilteredData(filtered);
      return;
    }

    const now = new Date();
    const filtered = data.filter(item => {
      const itemDate = new Date(item.date);
      if (dateFilter === 'TODAY') {
        return itemDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'WEEK') {
        const diffTime = Math.abs(now.getTime() - itemDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays <= 7;
      } else if (dateFilter === 'MONTH') {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    setFilteredData(filtered);
  };

  const handleExportExcel = async () => {
    if (filteredData.length === 0) {
      toast.error('Tidak ada data untuk di-export');
      return;
    }

    try {
      // Dynamic import to avoid SSR issues if any, and only load when exporting
      const XLSX = await import('xlsx');
      
      const headers = ['Tanggal', 'Nomor Member', 'Nama', 'Total Pax (Scanned)'];
      
      // Prepare data array
      const wsData = [
        headers,
        ...filteredData.map(row => [
          row.date.split('-').reverse().join('-'),
          row.member_number,
          row.name,
          row.total_pax
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths for neatness
      ws['!cols'] = [
        { wch: 15 }, // Tanggal
        { wch: 20 }, // Nomor Member
        { wch: 30 }, // Nama
        { wch: 20 }  // Total Pax
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reconciliation");
      
      const fileName = `reconciliation_report_${dateFilter.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Laporan Excel berhasil diunduh!');
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat file Excel');
    }
  };

  return (
    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1.25rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 0.25rem 0' }}>Laporan Anti-Fraud (Face Scan)</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Gunakan data ini untuk mencocokkan jumlah Pax yang masuk dengan tiket yang diterbitkan.</p>
        </div>
        <button 
          onClick={handleExportExcel}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#10b981', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export Excel
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Filter Waktu:</span>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setDateFilter('TODAY')}
            style={{ padding: '0.4rem 1rem', borderRadius: '2rem', border: 'none', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: dateFilter === 'TODAY' ? '#10b981' : '#e2e8f0', color: dateFilter === 'TODAY' ? 'white' : '#475569' }}
          >Hari Ini</button>
          <button 
            onClick={() => setDateFilter('WEEK')}
            style={{ padding: '0.4rem 1rem', borderRadius: '2rem', border: 'none', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: dateFilter === 'WEEK' ? '#10b981' : '#e2e8f0', color: dateFilter === 'WEEK' ? 'white' : '#475569' }}
          >7 Hari Terakhir</button>
          <button 
            onClick={() => setDateFilter('MONTH')}
            style={{ padding: '0.4rem 1rem', borderRadius: '2rem', border: 'none', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: dateFilter === 'MONTH' ? '#10b981' : '#e2e8f0', color: dateFilter === 'MONTH' ? 'white' : '#475569' }}
          >Bulan Ini</button>
          <button 
            onClick={() => setDateFilter('ALL')}
            style={{ padding: '0.4rem 1rem', borderRadius: '2rem', border: 'none', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: dateFilter === 'ALL' ? '#10b981' : '#e2e8f0', color: dateFilter === 'ALL' ? 'white' : '#475569' }}
          >Semua Waktu</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '2px solid #cbd5e1', paddingLeft: '1rem', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Pilih Tanggal:</span>
          <input 
            type="date" 
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value);
              setDateFilter('CUSTOM');
            }}
            style={{ 
              padding: '0.4rem 0.75rem', 
              borderRadius: '0.5rem', 
              border: dateFilter === 'CUSTOM' ? '2px solid #10b981' : '1px solid #cbd5e1', 
              outline: 'none', 
              fontSize: '0.875rem',
              color: '#334155',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.875rem' }}>
              <th style={{ padding: '1rem 0.5rem' }}>Tanggal</th>
              <th style={{ padding: '1rem 0.5rem' }}>Nomor Member</th>
              <th style={{ padding: '1rem 0.5rem' }}>Nama</th>
              <th style={{ padding: '1rem 0.5rem' }}>Total Pax (Scanned)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Memuat data laporan...
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Tidak ada data scan wajah pada periode ini.
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem 0.5rem', color: '#334155' }}>{row.date.split('-').reverse().join('-')}</td>
                  <td style={{ padding: '1rem 0.5rem', fontFamily: 'monospace', color: '#64748b' }}>{row.member_number}</td>
                  <td style={{ padding: '1rem 0.5rem', fontWeight: '500', color: '#0f172a' }}>{row.name}</td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '700' }}>
                      {row.total_pax} Pax
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
