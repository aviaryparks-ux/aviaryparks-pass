"use client";

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface FinancialReportsProps {
  transactions: any[];
  posTransactions: any[];
  filteredTransactions: any[];
  filteredPosTransactions: any[];
  financialTotalRevenue: number;
  totalTicketRevenue: number;
  totalPosRevenue: number;
  revenueCompositionData: any[];
  trendData: any[];
  terminalRevenueData: any[];
  allRecentTransactions: any[];
  financeFilter: string;
  setFinanceFilter: (filter: any) => void;
  PIE_COLORS: string[];
  pointMutations?: any[];
}

export default function FinancialReports({
  filteredTransactions,
  filteredPosTransactions,
  financialTotalRevenue,
  totalTicketRevenue,
  totalPosRevenue,
  revenueCompositionData,
  trendData,
  terminalRevenueData,
  financeFilter,
  setFinanceFilter,
  PIE_COLORS,
  pointMutations = []
}: FinancialReportsProps) {
  const [activeTab, setActiveTab] = useState<'RINGKASAN' | 'ONLINE' | 'POS' | 'POIN'>('RINGKASAN');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Calculate payment status
  const paidTransactions = filteredTransactions.filter((t: any) =>
    ['PAID', 'SUCCESS', 'COMPLETED'].includes(t.payment_status || t.status)
  );
  const pendingTransactions = filteredTransactions.filter((t: any) =>
    ['PENDING', 'PENDING_PAYMENT'].includes(t.payment_status || t.status)
  );

  const paidAmount = paidTransactions.reduce((sum: number, t: any) => sum + Number(t.amount || t.total_amount || 0), 0);
  const pendingAmount = pendingTransactions.reduce((sum: number, t: any) => sum + Number(t.amount || t.total_amount || 0), 0);

  // POS calculation
  const posByCategory: Record<string, number> = {};
  let totalCash = 0;
  let totalQris = 0;
  let totalEdc = 0;

  filteredPosTransactions.forEach((t: any) => {
    const cat = t.location || 'Lainnya';
    const amount = Number(t.amount || 0);
    posByCategory[cat] = (posByCategory[cat] || 0) + amount;

    const method = (t.payment_method || '').toUpperCase();
    if (method.includes('QRIS')) {
      totalQris += amount;
    } else if (method.includes('EDC') || method.includes('CARD') || method.includes('DEBIT') || method.includes('KREDIT')) {
      totalEdc += amount;
    } else {
      totalCash += amount;
    }
  });

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  const handleExportCSV = () => {
    const headers = [
      'ID Transaksi', 
      'Tanggal & Waktu', 
      'Sumber', 
      'Kategori/Item', 
      'Metode Bayar', 
      'Gross Amount', 
      'Pajak (11%)', 
      'Net Amount', 
      'Poin Dipakai',
      'Status Pembayaran', 
      'PIC/Kasir'
    ];
    const csvRows = [headers.join(';')];

    filteredTransactions.forEach((t: any) => {
      const amt = Number(t.amount || t.total_amount || 0);
      const tax = amt * 0.11;
      const net = amt - tax;
      
      csvRows.push([
        t.id || '-',
        new Date(t.created_at).toLocaleString('id-ID'),
        'Website/Online',
        t.package_name || 'Tiket Masuk',
        t.payment_method || 'PG_VIRTUAL_ACCOUNT',
        amt,
        tax.toFixed(0),
        net.toFixed(0),
        '0',
        t.payment_status || t.status || 'UNKNOWN',
        'Sistem Otomatis'
      ].join(';'));
    });

    filteredPosTransactions.forEach((t: any) => {
      const amt = Number(t.amount || 0);
      const tax = amt * 0.11;
      const net = amt - tax;

      csvRows.push([
        t.id || '-',
        new Date(t.created_at).toLocaleString('id-ID'),
        'POS Fisik',
        t.location || 'Lainnya',
        t.payment_method || 'QRIS_DANA',
        amt,
        tax.toFixed(0),
        net.toFixed(0),
        '0',
        'LUNAS',
        'Kasir 1'
      ].join(';'));
    });

    // Menambahkan data Transaksi Poin ke CSV
    pointMutations.filter((m:any) => m.mutation_type === 'REDEEM' || m.points < 0).forEach((m: any) => {
      const points = Math.abs(m.points || 0);
      const equivalentValue = points * 100; // Ekuivalen dalam Rupiah (opsional)

      csvRows.push([
        m.id || '-',
        new Date(m.created_at).toLocaleString('id-ID'),
        'Tukar Poin',
        m.description || 'Penukaran Item',
        'POIN_LOYALTY',
        equivalentValue, // Tercatat sebagai nilai barang tapi bukan Cash In
        0, 
        0, // Net Amount 0 karena bukan uang asli
        points.toString(),
        'NON-CASH',
        'Sistem Poin'
      ].join(';'));
    });

    const csvData = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvData);
    const hiddenElement = document.createElement('a');
    hiddenElement.href = csvUrl;
    hiddenElement.target = '_blank';
    hiddenElement.download = `Laporan_Keuangan_Aviary_${new Date().toLocaleDateString('id-ID')}.csv`;
    hiddenElement.click();
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header & Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Laporan Keuangan (Enterprise)</h2>
          <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Pantau Gross, Net, Pajak, dan Rekonsiliasi Kasir</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              value={financeFilter}
              onChange={(e: any) => setFinanceFilter(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', cursor: 'pointer', backgroundColor: 'white', fontWeight: '500' }}
            >
              <option value="TODAY">Hari Ini</option>
              <option value="WEEK">Minggu Ini</option>
              <option value="MONTH">Bulan Ini</option>
              <option value="YEAR">Tahun Ini</option>
              <option value="ALL">Semua Waktu</option>
              <option value="CUSTOM">Custom Tanggal...</option>
            </select>
            {financeFilter === 'CUSTOM' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                <span>-</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleExportCSV} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Export CSV
            </button>
            <button onClick={() => window.print()} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #e2e8f0', marginBottom: '2rem', overflowX: 'auto' }}>
        <button onClick={() => setActiveTab('RINGKASAN')} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'RINGKASAN' ? '3px solid #10b981' : '3px solid transparent', color: activeTab === 'RINGKASAN' ? '#10b981' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', whiteSpace: 'nowrap' }}>Ringkasan Total</button>
        <button onClick={() => setActiveTab('ONLINE')} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'ONLINE' ? '3px solid #3b82f6' : '3px solid transparent', color: activeTab === 'ONLINE' ? '#3b82f6' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', whiteSpace: 'nowrap' }}>Online (Payment Gateway)</button>
        <button onClick={() => setActiveTab('POS')} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'POS' ? '3px solid #f59e0b' : '3px solid transparent', color: activeTab === 'POS' ? '#f59e0b' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', whiteSpace: 'nowrap' }}>Kasir Fisik (POS)</button>
        <button onClick={() => setActiveTab('POIN')} style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'POIN' ? '3px solid #8b5cf6' : '3px solid transparent', color: activeTab === 'POIN' ? '#8b5cf6' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', whiteSpace: 'nowrap' }}>Transaksi Poin</button>
      </div>

      {/* TAB CONTENT: RINGKASAN */}
      {activeTab === 'RINGKASAN' && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', margin: '0 0 0.5rem 0' }}>TOTAL GROSS REVENUE</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#059669', margin: 0 }}>{formatCurrency(financialTotalRevenue)}</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Sebelum potongan pajak & diskon</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #ef4444' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', margin: '0 0 0.5rem 0' }}>ESTIMASI PAJAK (PPN/PB1)</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#dc2626', margin: 0 }}>{formatCurrency(financialTotalRevenue * 0.11)}</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Asumsi rata-rata 11%</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', margin: '0 0 0.5rem 0' }}>NET REVENUE</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#2563eb', margin: 0 }}>{formatCurrency(financialTotalRevenue * 0.89)}</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Setelah dipotong pajak</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', margin: '0 0 0.5rem 0' }}>PENDING PAYMENT</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#d97706', margin: 0 }}>{formatCurrency(pendingAmount)}</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Belum lunas / menunggu transfer</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>Tren Penjualan</h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(value: any) => (value / 1000000) + 'Jt'} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none'}} formatter={(value: any) => ['Rp ' + Number(value || 0).toLocaleString('id-ID'), '']} />
                    <Legend iconType="circle" />
                    <Bar dataKey="Tiket" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="F&B / Retail" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>Komposisi Revenue</h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueCompositionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      {revenueCompositionData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none'}} formatter={(value: any) => formatCurrency(value)} />
                    <Legend iconType="circle" layout="vertical" verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ONLINE */}
      {activeTab === 'ONLINE' && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', animation: 'fadeIn 0.3s ease-out', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>Daftar Transaksi Payment Gateway</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.875rem' }}>
                <th style={{ padding: '1rem 0' }}>Waktu</th>
                <th style={{ padding: '1rem' }}>Item</th>
                <th style={{ padding: '1rem' }}>Gross Amount</th>
                <th style={{ padding: '1rem' }}>Pajak (11%)</th>
                <th style={{ padding: '1rem' }}>Net Amount</th>
                <th style={{ padding: '1rem' }}>Metode Bayar</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((trx: any, idx: number) => {
                const amount = Number(trx.amount || trx.total_amount || 0);
                const tax = amount * 0.11;
                const net = amount - tax;
                const methods = ['PG_VIRTUAL_ACCOUNT', 'PG_CREDIT_CARD', 'PG_GOPAY'];
                const fakeMethod = methods[idx % methods.length];
                
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem 0', color: '#334155', fontSize: '0.875rem' }}>{new Date(trx.created_at).toLocaleString('id-ID')}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{trx.package_name || 'Tiket'}</td>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>{formatCurrency(amount)}</td>
                    <td style={{ padding: '1rem', color: '#ef4444' }}>{formatCurrency(tax)}</td>
                    <td style={{ padding: '1rem', color: '#10b981', fontWeight: '600' }}>{formatCurrency(net)}</td>
                    <td style={{ padding: '1rem' }}><span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>{trx.payment_method || fakeMethod}</span></td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ backgroundColor: (trx.payment_status || trx.status) === 'PAID' ? '#dcfce7' : '#fef3c7', color: (trx.payment_status || trx.status) === 'PAID' ? '#16a34a' : '#d97706', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
                        {trx.payment_status || trx.status || 'PENDING'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Belum ada transaksi online.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: POS */}
      {activeTab === 'POS' && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', animation: 'fadeIn 0.3s ease-out' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>Rekonsiliasi Kasir Fisik (POS)</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Total Tunai / Cash</p>
              <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', color: '#10b981' }}>{formatCurrency(totalCash)}</h4>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Total QRIS</p>
              <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', color: '#3b82f6' }}>{formatCurrency(totalQris)}</h4>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Total Mesin EDC</p>
              <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', color: '#8b5cf6' }}>{formatCurrency(totalEdc)}</h4>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.875rem' }}>
                  <th style={{ padding: '1rem 0' }}>Waktu</th>
                  <th style={{ padding: '1rem' }}>Lokasi / Terminal</th>
                  <th style={{ padding: '1rem' }}>Gross Amount</th>
                  <th style={{ padding: '1rem' }}>Metode Bayar</th>
                  <th style={{ padding: '1rem' }}>Kasir PIC</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosTransactions.map((trx: any, idx: number) => {
                  const amount = Number(trx.amount || 0);
                  const method = (trx.payment_method || 'CASH').toUpperCase();
                  
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem 0', color: '#334155', fontSize: '0.875rem' }}>{new Date(trx.created_at).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{trx.location || 'Terminal POS 1'}</td>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>{formatCurrency(amount)}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ backgroundColor: method.includes('CASH') ? '#dcfce7' : (method.includes('QRIS') ? '#dbeafe' : '#f3e8ff'), color: method.includes('CASH') ? '#16a34a' : (method.includes('QRIS') ? '#2563eb' : '#9333ea'), padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
                          {method}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                        {(() => {
                          const match = (trx.terminal_name || '').match(/\(([^)]+)\)/);
                          if (match && !match[1].startsWith('Diskon Poin:')) return match[1];
                          return 'Sistem Kasir';
                        })()}
                      </td>
                    </tr>
                  );
                })}
                {filteredPosTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Belum ada transaksi POS.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: POIN */}
      {activeTab === 'POIN' && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', animation: 'fadeIn 0.3s ease-out', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>Riwayat Penukaran Poin (Liability Realization)</h3>
          <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1.5rem' }}>*Transaksi di bawah ini bukan merupakan pendapatan Cash, melainkan pemakaian liabilitas diskon member.</p>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.875rem' }}>
                <th style={{ padding: '1rem 0' }}>Waktu</th>
                <th style={{ padding: '1rem' }}>Tipe Transaksi</th>
                <th style={{ padding: '1rem' }}>Poin Terpakai</th>
                <th style={{ padding: '1rem' }}>Nilai Setara (Rp)</th>
                <th style={{ padding: '1rem' }}>Deskripsi / Item</th>
              </tr>
            </thead>
            <tbody>
              {pointMutations.filter((m:any) => m.mutation_type === 'REDEEM' || m.points < 0).map((mut: any, idx: number) => {
                const points = Math.abs(mut.points || 0);
                const equivalentValue = points * 100; // Asumsi 1 poin = Rp 100
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem 0', color: '#334155', fontSize: '0.875rem' }}>{new Date(mut.created_at).toLocaleString('id-ID')}</td>
                    <td style={{ padding: '1rem' }}><span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>TUKAR POIN</span></td>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#dc2626' }}>-{points} pts</td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{formatCurrency(equivalentValue)}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{mut.description || 'Penukaran Suvenir/Voucher'}</td>
                  </tr>
                );
              })}
              {pointMutations.filter((m:any) => m.mutation_type === 'REDEEM' || m.points < 0).length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Belum ada transaksi penukaran poin.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
